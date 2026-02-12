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
import { rebuildLinkIndex } from "@/app/_server/actions/link";
import { logAudit } from "@/app/_server/actions/log";
import { broadcast } from "@/app/_server/ws/broadcast";

export const createCategory = async (formData: FormData) => {
  try {
    const name = formData.get("name") as string;
    const parent = formData.get("parent") as string;
    const mode = formData.get("mode") as Modes;

    const userDir = await getUserModeDir(mode);
    const categoryPath = parent ? path.join(parent, name) : name;
    const categoryDir = path.join(userDir, categoryPath);
    await ensureDir(categoryDir);

    await logAudit({
      level: "INFO",
      action: "category_created",
      category: mode === Modes.NOTES ? "note" : "checklist",
      success: true,
      metadata: { categoryName: name, parentCategory: parent, mode },
    });

    await broadcast({
      type: "category",
      action: "created",
      entityId: name,
      username: await getUsername(),
    });

    return { success: true, data: { name, count: 0 } };
  } catch (error) {
    const name = formData.get("name") as string;
    const mode = formData.get("mode") as Modes;
    await logAudit({
      level: "ERROR",
      action: "category_created",
      category: mode === Modes.NOTES ? "note" : "checklist",
      success: false,
      errorMessage: "Failed to create category",
      metadata: { categoryName: name },
    });
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

    await logAudit({
      level: "INFO",
      action: "category_deleted",
      category: mode === Modes.NOTES ? "note" : "checklist",
      success: true,
      metadata: { categoryPath, mode },
    });

    try {
      revalidatePath("/");
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error,
      );
    }

    await broadcast({
      type: "category",
      action: "deleted",
      entityId: categoryPath,
      username: await getUsername(),
    });

    return { success: true };
  } catch (error) {
    const categoryPath = formData.get("path") as string;
    const mode = formData.get("mode") as Modes;
    await logAudit({
      level: "ERROR",
      action: "category_deleted",
      category: mode === Modes.NOTES ? "note" : "checklist",
      success: false,
      errorMessage: "Failed to delete category",
      metadata: { categoryPath },
    });
    return { error: "Failed to delete category" };
  }
};

export const renameCategory = async (formData: FormData) => {
  try {
    const oldPath = formData.get("oldPath") as string;
    const newName = formData.get("newName") as string;
    const mode = formData.get("mode") as Modes;

    if (!oldPath || !newName) {
      await logAudit({
        level: "WARNING",
        action: "category_renamed",
        category: mode === Modes.NOTES ? "note" : "checklist",
        success: false,
        errorMessage: "Both old path and new name are required",
      });
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
      await logAudit({
        level: "WARNING",
        action: "category_renamed",
        category: mode === Modes.NOTES ? "note" : "checklist",
        success: false,
        errorMessage: "Category not found",
        metadata: { oldPath },
      });
      return { error: "Category not found" };
    }

    if (
      await fs
        .access(newCategoryDir)
        .then(() => true)
        .catch(() => false)
    ) {
      await logAudit({
        level: "WARNING",
        action: "category_renamed",
        category: mode === Modes.NOTES ? "note" : "checklist",
        success: false,
        errorMessage: "Category with new name already exists",
        metadata: { oldPath, newName },
      });
      return { error: "Category with new name already exists" };
    }

    await fs.rename(oldCategoryDir, newCategoryDir);

    if (mode === Modes.NOTES) {
      try {
        const username = await getUsername();
        if (username) {
          const { commitNote } = await import("@/app/_server/actions/history");
          const { getUserNotes } = await import("@/app/_server/actions/note");

          const notesResult = await getUserNotes({ username, isRaw: true });
          if (notesResult.success && notesResult.data) {
            const notesInCategory = notesResult.data.filter((note) => {
              const category = note.category || "Uncategorized";
              return category === newPath || category.startsWith(`${newPath}/`);
            });

            for (const note of notesInCategory) {
              try {
                const oldCategory = (note.category || "Uncategorized").replace(
                  newPath,
                  oldPath,
                );
                const newCategory = note.category || "Uncategorized";
                const filePath = path.join(newCategoryDir, `${note.id}.md`);
                const fileContent = await fs.readFile(filePath, "utf-8");
                const titleMatch = fileContent.match(/^title:\s*(.+)$/m);
                const title = titleMatch ? titleMatch[1] : note.id!;

                await commitNote(
                  username,
                  path.join(newCategory, `${note.id}.md`),
                  "move",
                  title,
                  {
                    oldCategory,
                    newCategory,
                    oldPath: path.join(oldCategory, `${note.id}.md`),
                  },
                );
              } catch (error) {
                console.warn(
                  `Failed to commit git mv for note ${note.id}:`,
                  error,
                );
              }
            }
          }
        }
      } catch (error) {
        console.warn("Failed to commit category rename to git history:", error);
      }
    }

    await logAudit({
      level: "INFO",
      action: "category_renamed",
      category: mode === Modes.NOTES ? "note" : "checklist",
      success: true,
      metadata: { oldPath, newPath, newName, mode },
    });

    try {
      revalidatePath("/");
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error,
      );
    }

    await broadcast({
      type: "category",
      action: "updated",
      entityId: newName,
      username: await getUsername(),
    });

    return { success: true };
  } catch (error) {
    const oldPath = formData.get("oldPath") as string;
    const mode = formData.get("mode") as Modes;
    await logAudit({
      level: "ERROR",
      action: "category_renamed",
      category: mode === Modes.NOTES ? "note" : "checklist",
      success: false,
      errorMessage: "Failed to rename category",
      metadata: { oldPath },
    });
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

    await broadcast({
      type: "category",
      action: "updated",
      username: await getUsername(),
    });

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

    await broadcast({
      type: "category",
      action: "updated",
      username: await getUsername(),
    });

    return { success: true };
  } catch {
    return { error: "Failed to set item order" };
  }
};

const getOrderFileSafe = async (
  dirPath: string,
): Promise<{ categories: string[]; items: string[] }> => {
  const order = await readOrderFile(dirPath);
  return {
    categories: order?.categories || [],
    items: order?.items || [],
  };
};

const extractNameFromDndId = (
  dndId: string,
  type: "item" | "category",
): string => {
  if (!dndId) return "";
  const parts = dndId.split("::");
  if (type === "item") return parts[2] || "";
  if (type === "category") return (parts[1] || "").split("/").pop() || "";
  return "";
};

const reorderList = (
  list: string[],
  activeName: string,
  targetName: string,
  position: "before" | "after",
): string[] => {
  const result = [...list];
  if (!result.includes(activeName)) result.push(activeName);
  if (!result.includes(targetName)) result.push(targetName);

  const fromIdx = result.indexOf(activeName);
  result.splice(fromIdx, 1);

  const targetIdx = result.indexOf(targetName);
  result.splice(
    position === "before" ? targetIdx : targetIdx + 1,
    0,
    activeName,
  );
  return result;
};

const insertIntoList = (
  list: string[],
  activeName: string,
  targetName: string | null,
  position: "before" | "after",
): string[] => {
  const result = list.filter((n) => n !== activeName);
  if (targetName) {
    const targetIdx = result.indexOf(targetName);
    if (targetIdx !== -1) {
      result.splice(
        position === "before" ? targetIdx : targetIdx + 1,
        0,
        activeName,
      );
      return result;
    }
  }
  result.push(activeName);
  return result;
};

export const moveNode = async (formData: FormData) => {
  try {
    const mode = formData.get("mode") as Modes;
    const baseDir = await getUserModeDir(mode);
    const activeType = formData.get("activeType") as "item" | "category";
    const overType = formData.get("overType") as "drop-indicator" | "category";

    let activeName: string;
    let activeParentPath: string;

    if (activeType === "item") {
      activeName = formData.get("activeId") as string;
      activeParentPath = formData.get("activeItemCategory") as string;
    } else {
      const catPath = formData.get("activeCategoryPath") as string;
      activeName = catPath.split("/").pop()!;
      activeParentPath = catPath.includes("/")
        ? catPath.substring(0, catPath.lastIndexOf("/"))
        : "";
    }

    let destParentPath: string;
    let targetName: string | null = null;
    let targetPosition: "before" | "after" = "after";
    let crossTypeTarget = false;

    if (overType === "category") {
      destParentPath = formData.get("targetCategoryPath") as string;
    } else {
      destParentPath = (formData.get("targetParentPath") as string) || "";
      targetPosition = formData.get("targetPosition") as "before" | "after";
      const targetDndId = formData.get("targetDndId") as string;
      const targetType = formData.get("targetType") as "item" | "category";

      if (targetDndId) {
        if (targetType === activeType) {
          targetName = extractNameFromDndId(targetDndId, targetType);
        } else {
          crossTypeTarget = true;
        }
      }
    }

    if (activeType === "item" && !destParentPath) {
      destParentPath = "Uncategorized";
    }

    if (activeType === "category") {
      const activeCatPath = formData.get("activeCategoryPath") as string;
      if (overType === "category" && activeCatPath === destParentPath) {
        return { success: true };
      }
      if (
        destParentPath === activeCatPath ||
        destParentPath.startsWith(`${activeCatPath}/`)
      ) {
        return { error: "Cannot move a category into itself" };
      }
    }

    const isSameParent = activeParentPath === destParentPath;

    if (isSameParent && overType === "category") {
      return { success: true };
    }

    const oldParentDir = activeParentPath
      ? path.join(baseDir, activeParentPath)
      : baseDir;
    const newParentDir = destParentPath
      ? path.join(baseDir, destParentPath)
      : baseDir;
    const listKey = activeType === "item" ? "items" : "categories";

    if (isSameParent) {
      const order = await getOrderFileSafe(oldParentDir);
      const list = order[listKey];

      if (targetName && targetName !== activeName) {
        order[listKey] = reorderList(
          list,
          activeName,
          targetName,
          targetPosition,
        );
      } else if (crossTypeTarget) {
        const filtered = list.filter((n) => n !== activeName);
        order[listKey] =
          activeType === "item"
            ? [activeName, ...filtered]
            : [...filtered, activeName];
      } else {
        return { success: true };
      }

      await writeOrderFile(oldParentDir, order);
    } else {
      await ensureDir(newParentDir);

      const fileName = activeType === "item" ? `${activeName}.md` : activeName;
      const oldPath = path.join(oldParentDir, fileName);
      const newPath = path.join(newParentDir, fileName);

      await fs.rename(oldPath, newPath);

      const oldOrder = await getOrderFileSafe(oldParentDir);
      oldOrder[listKey] = oldOrder[listKey].filter((n) => n !== activeName);

      const newOrder = await getOrderFileSafe(newParentDir);
      newOrder[listKey] = insertIntoList(
        newOrder[listKey],
        activeName,
        targetName,
        targetPosition,
      );

      await writeOrderFile(oldParentDir, oldOrder);
      await writeOrderFile(newParentDir, newOrder);

      if (activeType === "item" && mode === Modes.NOTES) {
        try {
          const username = await getUsername();
          if (username) {
            const { commitNote } =
              await import("@/app/_server/actions/history");
            const fileContent = await fs.readFile(newPath, "utf-8");
            const titleMatch = fileContent.match(/^title:\s*(.+)$/m);
            const title = titleMatch ? titleMatch[1] : activeName;

            await commitNote(
              username,
              path.join(destParentPath || "Uncategorized", `${activeName}.md`),
              "move",
              title,
              {
                oldCategory: activeParentPath || "Uncategorized",
                newCategory: destParentPath || "Uncategorized",
                oldPath: path.join(
                  activeParentPath || "Uncategorized",
                  `${activeName}.md`,
                ),
              },
            );
          }
        } catch (error) {
          console.warn("Failed to commit note move to git history:", error);
        }
      }

      try {
        const username = await getUsername();
        if (username) {
          await rebuildLinkIndex(username);
        }
      } catch (error) {
        console.warn("Failed to update link index:", error);
      }
    }

    await logAudit({
      level: "INFO",
      action: "category_moved",
      category: mode === Modes.NOTES ? "note" : "checklist",
      success: true,
      metadata: {
        activeType,
        activeName,
        oldParent: activeParentPath,
        newParent: destParentPath,
        mode,
      },
    });

    revalidatePath("/");

    await broadcast({
      type: "category",
      action: "updated",
      username: await getUsername(),
    });

    return { success: true };
  } catch (error: any) {
    const mode = formData.get("mode") as Modes;
    const activeType = formData.get("activeType") as "item" | "category";
    await logAudit({
      level: "ERROR",
      action: "category_moved",
      category: mode === Modes.NOTES ? "note" : "checklist",
      success: false,
      errorMessage: `Failed to move node: ${error.message}`,
      metadata: { activeType },
    });
    return { error: `Failed to move node: ${error.message}` };
  }
};
