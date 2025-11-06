"use server";

import { revalidatePath } from "next/cache";
import path from "path";
import {
  ensureDir,
  serverDeleteDir,
  getUserModeDir,
  readOrderFile,
  writeOrderFile,
} from "@/app/_server/actions/file";
import fs from "fs/promises";
import { Modes } from "@/app/_types/enums";
import { buildCategoryTree } from "@/app/_utils/category-utils";
import { getUsername } from "@/app/_server/actions/users";
import { getRawNotes } from "@/app/_server/actions/note";
import { getRawLists } from "@/app/_server/actions/checklist";
import {
  updateReferencingContent,
  updateItemCategory,
  rebuildLinkIndex,
} from "@/app/_server/actions/link";
import {
  buildCategoryPath,
  encodeCategoryPath,
} from "@/app/_utils/global-utils";
import { encodeId } from "@/app/_utils/global-utils";

export const createCategory = async (formData: FormData) => {
  try {
    const name = formData.get("name") as string;
    const parent = formData.get("parent") as string;
    const mode = formData.get("mode") as Modes;

    const userDir = await getUserModeDir(mode);
    const categoryPath = parent ? path.join(parent, name) : name;
    const categoryDir = path.join(userDir, categoryPath);
    await ensureDir(categoryDir);

    return { success: true, data: { name, count: 0 } };
  } catch (error) {
    return { error: "Failed to create category" };
  }
};

export const deleteCategory = async (formData: FormData) => {
  try {
    const categoryPath = formData.get("path") as string;
    const mode = formData.get("mode") as Modes;

    const userDir = await getUserModeDir(mode);
    const categoryDir = path.join(userDir, categoryPath);
    await serverDeleteDir(categoryDir);

    try {
      revalidatePath("/");
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error
      );
    }
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete category" };
  }
};

export const renameCategory = async (formData: FormData) => {
  try {
    const oldPath = formData.get("oldPath") as string;
    const newName = formData.get("newName") as string;
    const mode = formData.get("mode") as Modes;

    if (!oldPath || !newName) {
      return { error: "Both old path and new name are required" };
    }

    const userDir = await getUserModeDir(mode);
    const oldCategoryDir = path.join(userDir, oldPath);

    const pathParts = oldPath.split("/");
    pathParts[pathParts.length - 1] = newName;
    const newPath = pathParts.join("/");
    const newCategoryDir = path.join(userDir, newPath);

    if (
      !(await fs
        .access(oldCategoryDir)
        .then(() => true)
        .catch(() => false))
    ) {
      return { error: "Category not found" };
    }

    if (
      await fs
        .access(newCategoryDir)
        .then(() => true)
        .catch(() => false)
    ) {
      return { error: "Category with new name already exists" };
    }

    await fs.rename(oldCategoryDir, newCategoryDir);

    try {
      revalidatePath("/");
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error
      );
    }
    return { success: true };
  } catch (error) {
    return { error: "Failed to rename category" };
  }
};

export const getCategories = async (mode: Modes, username?: string) => {
  try {
    const dir = await getUserModeDir(mode, username);
    await ensureDir(dir);

    const categories = await buildCategoryTree(dir);

    return { success: true, data: categories };
  } catch (error) {
    return { error: "Failed to fetch document categories" };
  }
};

export const setCategoryOrder = async (formData: FormData) => {
  try {
    const mode = formData.get("mode") as Modes;
    const parent = (formData.get("parent") as string) || "";
    const categoriesStr = formData.get("categories") as string;
    const categories = JSON.parse(categoriesStr) as string[];

    const baseDir = await getUserModeDir(mode);
    const dirPath = parent ? path.join(baseDir, parent) : baseDir;

    const existing = await readOrderFile(dirPath);
    const data = { categories, items: existing?.items };
    const result = await writeOrderFile(dirPath, data);
    if (!result.success) return { error: "Failed to write order" };

    try {
      revalidatePath("/");
    } catch {}
    return { success: true };
  } catch {
    return { error: "Failed to set category order" };
  }
};

export const setChecklistOrderInCategory = async (formData: FormData) => {
  try {
    const mode = formData.get("mode") as Modes;
    const category = (formData.get("category") as string) || "Uncategorized";
    const itemsStr = formData.get("items") as string;
    const items = JSON.parse(itemsStr) as string[];

    const baseDir = await getUserModeDir(mode);
    const dirPath = path.join(baseDir, category);

    const existing = await readOrderFile(dirPath);
    const data = { categories: existing?.categories, items };
    const result = await writeOrderFile(dirPath, data);
    if (!result.success) return { error: "Failed to write order" };

    try {
      revalidatePath("/");
    } catch {}
    return { success: true };
  } catch {
    return { error: "Failed to set item order" };
  }
};

const getOrderFileSafe = async (
  dirPath: string
): Promise<{ categories: string[]; items: string[] }> => {
  const order = await readOrderFile(dirPath);
  return {
    categories: order?.categories || [],
    items: order?.items || [],
  };
};

const arrayMove = (arr: string[], from: number, to: number) => {
  const newArr = [...arr];
  const [item] = newArr.splice(from, 1);
  newArr.splice(to, 0, item);
  return newArr;
};

const getRealIdFromDndId = (
  dndId: string,
  type: "item" | "category"
): string => {
  if (!dndId) return "";
  const parts = dndId.split("::");
  if (type === "item") {
    return parts[2];
  }
  if (type === "category") {
    return parts[1];
  }
  return "";
};

const getCategoryNameFromDndId = (dndId: string): string => {
  if (!dndId) return "";
  const parts = dndId.split("::");
  if (parts[0] === "category") {
    const pathParts = parts[1].split("/");
    return pathParts[pathParts.length - 1];
  }
  return "";
};

const getRealIdForList = (dndId: string, type: "item" | "category"): string => {
  if (type === "item") {
    return getRealIdFromDndId(dndId, "item");
  }
  if (type === "category") {
    return getCategoryNameFromDndId(dndId);
  }
  return "";
};

const insertIntoArray = (
  arr: string[],
  item: string,
  targetDndId: string,
  position: "before" | "after",
  targetType: "item" | "category",
  activeType: "item" | "category"
) => {
  const newArr = [...arr];
  if (!targetDndId) {
    if (position === "before") newArr.unshift(item);
    else newArr.push(item);
    return newArr;
  }

  if (activeType !== targetType) {
    if (activeType === "item") {
      newArr.unshift(item);
      return newArr;
    }
    if (activeType === "category") {
      newArr.push(item);
      return newArr;
    }
  }

  const realTargetId = getRealIdForList(targetDndId, activeType);

  if (realTargetId) {
    const targetIndex = newArr.indexOf(realTargetId);
    if (targetIndex !== -1) {
      newArr.splice(
        position === "before" ? targetIndex : targetIndex + 1,
        0,
        item
      );
    } else {
      newArr.push(item);
    }
  } else {
    newArr.push(item);
  }
  return newArr;
};

export const moveNode = async (formData: FormData) => {
  try {
    const mode = formData.get("mode") as Modes;
    const baseDir = await getUserModeDir(mode);

    const activeId = formData.get("activeId") as string;
    const activeCategoryPath = formData.get("activeCategoryPath") as string;
    const activeType = formData.get("activeType") as "item" | "category";

    const overType = formData.get("overType") as "drop-indicator" | "category";
    const overDndId = formData.get("overDndId") as string;
    const targetCategoryPath = formData.get("targetCategoryPath") as string;
    const targetParentPath = formData.get("targetParentPath") as string;
    const targetPosition = formData.get("targetPosition") as "before" | "after";
    const targetDndId = formData.get("targetDndId") as string;
    const targetType = formData.get("targetType") as "item" | "category";

    let activePath: string;
    let activeParentPath: string | null;
    let activeName: string;

    if (activeType === "item") {
      activeParentPath = formData.get("activeItemCategory") as string;
      activePath = path.join(baseDir, activeParentPath, `${activeId}.md`);
      activeName = activeId;
    } else {
      activePath = path.join(baseDir, activeCategoryPath);
      activeParentPath = activeCategoryPath.includes("/")
        ? activeCategoryPath.substring(0, activeCategoryPath.lastIndexOf("/"))
        : null;
      activeName = activeCategoryPath.split("/").pop()!;
    }

    let newParentPath: string | null = null;
    if (overType === "category") {
      newParentPath = targetCategoryPath;
    } else if (overType === "drop-indicator") {
      newParentPath = targetParentPath;
    }

    if (newParentPath === null) {
      newParentPath = "";
    }

    if (activeType === "item" && newParentPath === "") {
      newParentPath = "Uncategorized";
    }

    const oldParentDir = activeParentPath
      ? path.join(baseDir, activeParentPath)
      : baseDir;
    const newParentDir = newParentPath
      ? path.join(baseDir, newParentPath)
      : baseDir;

    await ensureDir(newParentDir);

    const oldOrder = await getOrderFileSafe(oldParentDir);
    const newOrder =
      oldParentDir === newParentDir
        ? oldOrder
        : await getOrderFileSafe(newParentDir);

    const listKey = activeType === "item" ? "items" : "categories";
    const oldList = oldOrder[listKey];
    const newList = newOrder[listKey];

    const oldIndex = oldList.indexOf(activeName);

    if (oldParentDir === newParentDir) {
      const realTargetId = getRealIdForList(targetDndId, targetType);

      if (!realTargetId || realTargetId === activeName) {
        return { success: true };
      }

      const targetIndex = newList.indexOf(realTargetId);
      if (oldIndex === -1 || targetIndex === -1) {
        return { success: false, error: "Item or target not found in order" };
      }
      const toIndex =
        targetPosition === "before" ? targetIndex : targetIndex + 1;
      const finalIndex = toIndex > oldIndex ? toIndex - 1 : toIndex;

      const reorderedList = arrayMove(oldList, oldIndex, finalIndex);
      newOrder[listKey] = reorderedList;
    } else {
      if (oldIndex !== -1) {
        oldList.splice(oldIndex, 1);
      }
      newOrder[listKey] = insertIntoArray(
        newList,
        activeName,
        targetDndId,
        targetPosition,
        targetType,
        activeType
      );
    }

    if (overType === "category") {
      if (!newOrder[listKey].includes(activeName)) {
        newOrder[listKey].push(activeName);
      }
    }

    const newName = activeType === "item" ? `${activeId}.md` : activeName;
    const newPath = path.join(newParentDir, newName);

    if (activePath !== newPath) {
      try {
        await fs.rename(activePath, newPath);
      } catch (error: any) {
        console.error(
          `Failed to move node from ${activePath} to ${newPath}:`,
          error
        );
        return { error: `Failed to move node: ${error.message}` };
      }
    }

    if (oldParentDir === newParentDir) {
      await writeOrderFile(newParentDir, newOrder);
    } else {
      await writeOrderFile(oldParentDir, oldOrder);
      await writeOrderFile(newParentDir, newOrder);
    }

    if (activeType === "item" && oldParentDir !== newParentDir) {
      try {
        const username = await getUsername();
        if (!username) {
          console.warn("Could not get username for link index update");
        } else {
          const fileContent = await fs.readFile(newPath, "utf-8");
          const titleMatch = fileContent.match(/^# (.+)$/m);
          const title = titleMatch ? titleMatch[1] : activeId;

          const oldCategory = activeParentPath || "Uncategorized";
          const newCategory = newParentPath || "Uncategorized";

          const oldItemKey = buildCategoryPath(oldCategory, activeId);
          const newItemKey = buildCategoryPath(newCategory, activeId);

          const itemType = mode === Modes.CHECKLISTS ? "checklist" : "note";

          await updateReferencingContent(
            username,
            itemType as "note" | "checklist",
            oldItemKey,
            newItemKey,
            title
          );
          await updateItemCategory(
            username,
            itemType as "note" | "checklist",
            oldItemKey,
            newItemKey
          );
          await rebuildLinkIndex(username);

          try {
            const routePrefix = itemType === "note" ? "/note" : "/checklist";
            revalidatePath(`${routePrefix}/${oldItemKey}`);
            revalidatePath(`${routePrefix}/${newItemKey}`);
          } catch (error) {
            console.warn(
              "Cache revalidation failed for moved item paths:",
              error
            );
          }
        }
      } catch (error) {
        console.warn("Failed to update link index for moved item:", error);
      }
    }

    if (activeType === "category" && activeParentPath !== newParentPath) {
      try {
        const username = await getUsername();
        if (!username) {
          console.warn("Could not get username for category link index update");
        } else {
          const oldCategoryPath = activeCategoryPath;
          const newCategoryPath = newParentPath
            ? newParentPath === ""
              ? activeName
              : `${newParentPath}/${activeName}`
            : activeName;

          const [notesResult, checklistsResult] = await Promise.all([
            getRawNotes(username),
            getRawLists(username),
          ]);

          const allNotes = notesResult.success ? notesResult.data || [] : [];
          const allChecklists = checklistsResult.success
            ? checklistsResult.data || []
            : [];

          const movedNotes = allNotes.filter((note) => {
            const category = note.category || "Uncategorized";
            return (
              category === oldCategoryPath ||
              category.startsWith(`${oldCategoryPath}/`)
            );
          });

          const movedChecklists = allChecklists.filter((checklist) => {
            const category = checklist.category || "Uncategorized";
            return (
              category === oldCategoryPath ||
              category.startsWith(`${oldCategoryPath}/`)
            );
          });

          for (const note of movedNotes) {
            const oldCategory = note.category || "Uncategorized";
            const newCategory = oldCategory.replace(
              oldCategoryPath,
              newCategoryPath
            );

            const oldItemKey = buildCategoryPath(oldCategory, note.id);
            const newItemKey = buildCategoryPath(newCategory, note.id);

            await updateReferencingContent(
              username,
              "note",
              oldItemKey,
              newItemKey,
              note.title
            );

            await updateItemCategory(username, "note", oldItemKey, newItemKey);

            try {
              revalidatePath(`/note/${oldItemKey}`);
              revalidatePath(`/note/${newItemKey}`);
            } catch (error) {
              console.warn("Cache revalidation failed for moved note:", error);
            }
          }

          for (const checklist of movedChecklists) {
            const oldCategory = checklist.category || "Uncategorized";
            const newCategory = oldCategory.replace(
              oldCategoryPath,
              newCategoryPath
            );

            const oldItemKey = buildCategoryPath(oldCategory, checklist.id);
            const newItemKey = buildCategoryPath(newCategory, checklist.id);

            await updateReferencingContent(
              username,
              "checklist",
              oldItemKey,
              newItemKey,
              checklist.title
            );

            await updateItemCategory(
              username,
              "checklist",
              oldItemKey,
              newItemKey
            );

            try {
              revalidatePath(`/checklist/${oldItemKey}`);
              revalidatePath(`/checklist/${newItemKey}`);
            } catch (error) {
              console.warn(
                "Cache revalidation failed for moved checklist:",
                error
              );
            }
          }

          await rebuildLinkIndex(username);
        }
      } catch (error) {
        console.warn("Failed to update link index for moved category:", error);
      }
    }

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { error: `Failed to move node: ${error.message}` };
  }
};
