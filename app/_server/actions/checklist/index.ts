"use server";

import path from "path";
import { Checklist, User } from "@/app/_types";
import {
  getUserModeDir,
  ensureDir,
  serverReadFile,
  serverReadDir,
  readOrderFile,
} from "@/app/_server/actions/file";
import { getCurrentUser } from "@/app/_server/actions/users";
import { readJsonFile } from "../file";
import fs from "fs/promises";
import { parseMarkdown } from "@/app/_utils/checklist-utils";
import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";
import { ARCHIVED_DIR_NAME, USERS_FILE } from "@/app/_consts/files";
import {
  ItemTypes,
  Modes,
  PermissionTypes,
  TaskStatus,
} from "@/app/_types/enums";
import { ChecklistType } from "@/app/_types";
import { generateUniqueFilename } from "@/app/_utils/filename-utils";
import { sanitizeFilename } from "@/app/_utils/filename-utils";
import { serverWriteFile } from "@/app/_server/actions/file";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { isAdmin } from "@/app/_server/actions/users";
import { serverDeleteFile } from "@/app/_server/actions/file";
import { revalidatePath } from "next/cache";
import {
  buildCategoryPath,
  decodeCategoryPath,
} from "@/app/_utils/global-utils";
import {
  updateIndexForItem,
  parseInternalLinks,
  removeItemFromIndex,
  updateItemCategory,
} from "@/app/_server/actions/link";
import {
  shouldRefreshRecurringItem,
  refreshRecurringItem,
} from "@/app/_utils/recurrence-utils";
import { parseChecklistContent } from "@/app/_utils/client-parser-utils";
import { checkUserPermission } from "@/app/_server/actions/sharing";

const readListsRecursively = async (
  dir: string,
  basePath: string = "",
  owner: string,
  allowArchived?: boolean
): Promise<Checklist[]> => {
  const lists: Checklist[] = [];
  const entries = await serverReadDir(dir);

  const order = await readOrderFile(dir);
  const dirNames = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  const orderedDirNames: string[] = order?.categories
    ? [
      ...order.categories.filter((n) => dirNames.includes(n)),
      ...dirNames
        .filter((n) => !order.categories!.includes(n))
        .sort((a, b) => a.localeCompare(b)),
    ]
    : dirNames.sort((a, b) => a.localeCompare(b));

  for (const dirName of orderedDirNames) {
    if (dirName === ARCHIVED_DIR_NAME && !allowArchived) {
      continue;
    }

    const categoryPath = basePath ? `${basePath}/${dirName}` : dirName;
    const categoryDir = path.join(dir, dirName);

    try {
      const files = await serverReadDir(categoryDir);
      const mdFiles = files.filter((f) => f.isFile() && f.name.endsWith(".md"));

      const ids = mdFiles.map((f) => path.basename(f.name, ".md"));
      const categoryOrder = await readOrderFile(categoryDir);
      const orderedIds: string[] = categoryOrder?.items
        ? [
          ...categoryOrder.items.filter((id) => ids.includes(id)),
          ...ids
            .filter((id) => !categoryOrder.items!.includes(id))
            .sort((a, b) => a.localeCompare(b)),
        ]
        : ids.sort((a, b) => a.localeCompare(b));

      for (const id of orderedIds) {
        const fileName = `${id}.md`;
        const filePath = path.join(categoryDir, fileName);
        try {
          const content = await serverReadFile(filePath);
          const stats = await fs.stat(filePath);
          lists.push(
            parseMarkdown(content, id, categoryPath, owner, false, stats)
          );
        } catch { }
      }
    } catch { }

    const subLists = await readListsRecursively(
      categoryDir,
      categoryPath,
      owner,
      allowArchived
    );
    lists.push(...subLists);
  }

  return lists;
};

/**
 * Check and refresh recurring items in a checklist
 * If any recurring items are completed and past their due date, refresh them
 * @param checklist - The checklist to check
 * @returns Updated checklist if changes were made, otherwise original checklist
 */
const checkAndRefreshRecurringItems = async (
  checklist: Checklist
): Promise<{ checklist: Checklist; hasChanges: boolean }> => {
  let hasChanges = false;
  const updatedItems = checklist.items.map((item) => {
    if (shouldRefreshRecurringItem(item)) {
      hasChanges = true;
      return refreshRecurringItem(item);
    }
    return item;
  });

  if (!hasChanges) {
    return { checklist, hasChanges: false };
  }

  const updatedChecklist: Checklist = {
    ...checklist,
    items: updatedItems,
    updatedAt: new Date().toISOString(),
  };

  try {
    const ownerDir = path.join(
      process.cwd(),
      "data",
      CHECKLISTS_FOLDER,
      checklist.owner!
    );
    const categoryDir = path.join(
      ownerDir,
      checklist.category || "Uncategorized"
    );
    const filePath = path.join(categoryDir, `${checklist.id}.md`);

    await serverWriteFile(filePath, listToMarkdown(updatedChecklist));
  } catch (error) {
    console.error("Error saving refreshed recurring items:", error);
    return { checklist, hasChanges: false };
  }

  return { checklist: updatedChecklist, hasChanges: true };
};

export const getLists = async (username?: string, allowArchived?: boolean) => {
  try {
    let userDir: string;
    let currentUser: any = null;

    if (username) {
      userDir = path.join(process.cwd(), "data", CHECKLISTS_FOLDER, username);
      currentUser = { username };
    } else {
      currentUser = await getCurrentUser();
      if (!currentUser) {
        return { success: false, error: "Not authenticated" };
      }
      userDir = await getUserModeDir(Modes.CHECKLISTS);
    }
    await ensureDir(userDir);

    const lists = await readListsRecursively(
      userDir,
      "",
      currentUser.username,
      allowArchived
    );

    const { getAllSharedItemsForUser } = await import(
      "@/app/_server/actions/sharing"
    );
    const sharedData = await getAllSharedItemsForUser(currentUser.username);

    for (const sharedItem of sharedData.checklists) {
      try {
        const decodedCategory = decodeCategoryPath(
          sharedItem.category || "Uncategorized"
        );

        const sharedFilePath = path.join(
          process.cwd(),
          "data",
          CHECKLISTS_FOLDER,
          sharedItem.sharer,
          decodedCategory,
          `${sharedItem.id}.md`
        );

        const content = await fs.readFile(sharedFilePath, "utf-8");
        const stats = await fs.stat(sharedFilePath);
        lists.push(
          parseMarkdown(
            content,
            sharedItem.id,
            decodedCategory,
            sharedItem.sharer,
            true,
            stats
          )
        );
      } catch (error) {
        continue;
      }
    }

    const refreshedLists = await Promise.all(
      lists.map(async (list) => {
        const { checklist } = await checkAndRefreshRecurringItems(list);
        return checklist;
      })
    );

    return { success: true, data: refreshedLists };
  } catch (error) {
    console.error("Error in getLists:", error);
    return { success: false, error: "Failed to fetch lists" };
  }
};

const getChecklistType = (content: string): ChecklistType => {
  if (content.includes("<!-- type:task -->")) {
    return "task";
  } else if (
    content.includes(" | status:") ||
    content.includes(" | time:") ||
    content.includes(" | estimated:") ||
    content.includes(" | target:")
  ) {
    return "task";
  }
  return "simple";
};

export const getRawLists = async (
  username?: string,
  allowArchived?: boolean
) => {
  try {
    let userDir: string;
    let currentUser: any = null;

    if (username) {
      userDir = path.join(process.cwd(), "data", CHECKLISTS_FOLDER, username);
      currentUser = { username };
    } else {
      currentUser = await getCurrentUser();
      if (!currentUser) {
        return { success: false, error: "Not authenticated" };
      }
      userDir = await getUserModeDir(Modes.CHECKLISTS);
    }
    await ensureDir(userDir);

    const lists: Checklist[] = [];
    const entries = await serverReadDir(userDir);

    const order = await readOrderFile(userDir);
    const dirNames = entries.filter((e) => e.isDirectory()).map((e) => e.name);

    const orderedDirNames: string[] = order?.categories
      ? [
        ...order.categories.filter((n) => dirNames.includes(n)),
        ...dirNames
          .filter((n) => !order.categories!.includes(n))
          .sort((a, b) => a.localeCompare(b)),
      ]
      : dirNames.sort((a, b) => a.localeCompare(b));

    for (const dirName of orderedDirNames) {
      if (dirName === ARCHIVED_DIR_NAME && !allowArchived) {
        continue;
      }

      const categoryPath = dirName;
      const categoryDir = path.join(userDir, dirName);

      try {
        const files = await serverReadDir(categoryDir);
        const mdFiles = files.filter(
          (f) => f.isFile() && f.name.endsWith(".md")
        );

        const ids = mdFiles.map((f) => path.basename(f.name, ".md"));
        const categoryOrder = await readOrderFile(categoryDir);
        const orderedIds: string[] = categoryOrder?.items
          ? [
            ...categoryOrder.items.filter((id) => ids.includes(id)),
            ...ids
              .filter((id) => !categoryOrder.items!.includes(id))
              .sort((a, b) => a.localeCompare(b)),
          ]
          : ids.sort((a, b) => a.localeCompare(b));

        for (const id of orderedIds) {
          const fileName = `${id}.md`;
          const filePath = path.join(categoryDir, fileName);
          try {
            const content = await serverReadFile(filePath);
            const stats = await fs.stat(filePath);
            const type = getChecklistType(content);
            const rawList: Checklist & { rawContent: string } = {
              id,
              title: id,
              type,
              category: categoryPath,
              items: [],
              createdAt: stats.birthtime.toISOString(),
              updatedAt: stats.mtime.toISOString(),
              owner: currentUser.username,
              isShared: false,
              rawContent: content,
            };
            lists.push(rawList as Checklist);
          } catch { }
        }
      } catch { }
    }

    const { getAllSharedItemsForUser } = await import(
      "@/app/_server/actions/sharing"
    );
    const sharedData = await getAllSharedItemsForUser(currentUser.username);

    for (const sharedItem of sharedData.checklists) {
      try {
        const decodedCategory = decodeCategoryPath(
          sharedItem.category || "Uncategorized"
        );

        const sharedFilePath = path.join(
          process.cwd(),
          "data",
          CHECKLISTS_FOLDER,
          sharedItem.sharer,
          decodedCategory,
          `${sharedItem.id}.md`
        );

        const content = await fs.readFile(sharedFilePath, "utf-8");
        const stats = await fs.stat(sharedFilePath);
        const type = getChecklistType(content);
        const rawList: Checklist & { rawContent: string } = {
          id: sharedItem.id,
          title: sharedItem.id,
          type,
          category: decodedCategory,
          items: [],
          createdAt: stats.birthtime.toISOString(),
          updatedAt: stats.mtime.toISOString(),
          owner: sharedItem.sharer,
          isShared: true,
          rawContent: content,
        };
        lists.push(rawList as Checklist);
      } catch (error) {
        continue;
      }
    }

    return { success: true, data: lists };
  } catch (error) {
    console.error("Error in getRawLists:", error);
    return { success: false, error: "Failed to fetch raw lists" };
  }
};

export const getProjectedLists = async (projection: string[]) => {
  try {
    const checklistsResults = await getRawLists();

    if (!checklistsResults.success || !checklistsResults.data) {
      return { success: false, error: "Failed to fetch notes" };
    }

    const projectedLists = checklistsResults.data.map((list: Checklist) => {
      const projectedList: Partial<Checklist> = {};
      for (const key of projection) {
        if (Object.prototype.hasOwnProperty.call(list, key)) {
          (projectedList as any)[key] = (list as any)[key];
        }
      }
      return projectedList;
    });

    return {
      success: true,
      data: projectedLists,
    };
  } catch (error) {
    console.error("Error in getProjectedLists:", error);
    return { success: false, error: "Failed to fetch lists" };
  }
};

export const getListById = async (
  id: string,
  username?: string,
  category?: string,
  unarchive?: boolean
): Promise<Checklist | undefined> => {
  const lists = await (username
    ? getRawLists(username, unarchive)
    : getAllLists(unarchive));

  if (!lists.success || !lists.data) {
    throw new Error(lists.error || "Failed to fetch lists");
  }

  const list = lists.data.find(
    (list) =>
      list.id === id &&
      (!category ||
        list.category?.toLowerCase() ===
        decodeCategoryPath(category).toLowerCase())
  );

  if (list && "rawContent" in list) {
    const parsedData = parseChecklistContent((list as any).rawContent, list.id);
    const result = {
      ...list,
      title: parsedData.title,
      items: parsedData.items,
    };
    return result;
  }

  return list;
};

export const getAllLists = async (allowArchived?: boolean) => {
  try {
    const allLists: Checklist[] = [];

    const users: User[] = await readJsonFile(USERS_FILE);

    for (const user of users) {
      const userDir = path.join(
        process.cwd(),
        "data",
        CHECKLISTS_FOLDER,
        user.username
      );

      try {
        const userLists = await readListsRecursively(
          userDir,
          "",
          user.username,
          allowArchived
        );
        allLists.push(...userLists);
      } catch (error) {
        continue;
      }
    }

    return { success: true, data: allLists };
  } catch (error) {
    console.error("Error in getAllLists:", error);
    return { success: false, error: "Failed to fetch all lists" };
  }
};

export const createList = async (formData: FormData) => {
  try {
    const title = formData.get("title") as string;
    const category = (formData.get("category") as string) || "Uncategorized";
    const type = (formData.get("type") as ChecklistType) || "simple";

    const userDir = await getUserModeDir(Modes.CHECKLISTS);
    const categoryDir = path.join(userDir, category);
    await ensureDir(categoryDir);

    const filename = await generateUniqueFilename(categoryDir, title);
    const id = path.basename(filename, ".md");
    const filePath = path.join(categoryDir, filename);

    const newList: Checklist = {
      id,
      title,
      type,
      category,
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await serverWriteFile(filePath, listToMarkdown(newList));

    try {
      const content = newList.items.map((i) => i.text).join("\n");
      const links = parseInternalLinks(content);
      const currentUser = await getCurrentUser();
      if (currentUser?.username) {
        const itemKey = `${newList.category || "Uncategorized"}/${newList.id}`;
        await updateIndexForItem(
          currentUser.username,
          ItemTypes.CHECKLIST,
          itemKey,
          links
        );
      }
    } catch (error) {
      console.warn(
        "Failed to update link index for new checklist:",
        newList.id,
        error
      );
    }

    return { success: true, data: newList };
  } catch (error) {
    console.error("Error creating list:", error);
    return { error: "Failed to create list" };
  }
};

export const updateList = async (formData: FormData) => {
  try {
    const id = formData.get("id") as string;
    const title = formData.get("title") as string;
    const category = formData.get("category") as string;
    const originalCategory = formData.get("originalCategory") as string;
    const user = formData.get("user") as string;
    const unarchive = formData.get("unarchive") as string;

    const currentList = await getListById(
      id,
      user || undefined,
      originalCategory,
      unarchive === "true"
    );

    const canEdit = await checkUserPermission(
      id,
      originalCategory,
      ItemTypes.CHECKLIST,
      user || "",
      PermissionTypes.EDIT
    );

    if (!canEdit) {
      return { error: "Permission denied" };
    }

    if (!currentList) {
      throw new Error("List not found");
    }

    const updatedList: Checklist = {
      ...currentList,
      title,
      category: category || currentList.category,
      updatedAt: new Date().toISOString(),
    };

    const ownerDir = path.join(
      process.cwd(),
      "data",
      CHECKLISTS_FOLDER,
      currentList.owner!
    );
    const categoryDir = path.join(
      ownerDir,
      updatedList.category || "Uncategorized"
    );
    await ensureDir(categoryDir);

    let newFilename: string;
    let newId = id;

    const sanitizedTitle = sanitizeFilename(title);
    const currentFilename = `${id}.md`;
    const expectedFilename = `${sanitizedTitle}.md`;

    if (title !== currentList.title || currentFilename !== expectedFilename) {
      newFilename = await generateUniqueFilename(categoryDir, title);
      newId = path.basename(newFilename, ".md");
    } else {
      newFilename = `${id}.md`;
    }

    if (newId !== id) {
      updatedList.id = newId;
    }

    const filePath = path.join(categoryDir, newFilename);

    let oldFilePath: string | null = null;
    if (category && category !== currentList.category) {
      oldFilePath = path.join(
        ownerDir,
        currentList.category || "Uncategorized",
        `${id}.md`
      );
    } else if (newId !== id) {
      oldFilePath = path.join(
        ownerDir,
        currentList.category || "Uncategorized",
        `${id}.md`
      );
    }

    await serverWriteFile(filePath, listToMarkdown(updatedList));

    try {
      const content = updatedList.items.map((i) => i.text).join("\n");
      const links = parseInternalLinks(content);
      const newItemKey = `${updatedList.category || "Uncategorized"}/${updatedList.id
        }`;

      const oldItemKey = `${currentList.category || "Uncategorized"}/${id}`;
      if (oldItemKey !== newItemKey) {
        await updateItemCategory(
          currentList.owner!,
          ItemTypes.CHECKLIST,
          oldItemKey,
          newItemKey
        );
      }

      await updateIndexForItem(
        currentList.owner!,
        ItemTypes.CHECKLIST,
        newItemKey,
        links
      );
    } catch (error) {
      console.warn(
        "Failed to update link index for checklist:",
        updatedList.id,
        error
      );
    }

    if (newId !== id || (category && category !== currentList.category)) {
      const { updateSharingData } = await import(
        "@/app/_server/actions/sharing"
      );

      await updateSharingData(
        {
          id,
          category: currentList.category || "Uncategorized",
          itemType: ItemTypes.CHECKLIST,
          sharer: currentList.owner!,
        },
        {
          id: newId,
          category: updatedList.category || "Uncategorized",
          itemType: ItemTypes.CHECKLIST,
          sharer: currentList.owner!,
        }
      );
    }

    if (oldFilePath && oldFilePath !== filePath) {
      await serverDeleteFile(oldFilePath);
    }

    try {
      revalidatePath("/");
      const oldCategoryPath = buildCategoryPath(
        currentList.category || "Uncategorized",
        id
      );
      const newCategoryPath = buildCategoryPath(
        updatedList.category || "Uncategorized",
        newId !== id ? newId : id
      );

      revalidatePath(`/checklist/${oldCategoryPath}`);

      if (newId !== id || currentList.category !== updatedList.category) {
        revalidatePath(`/checklist/${newCategoryPath}`);
      }
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error
      );
    }

    return { success: true, data: updatedList };
  } catch (error) {
    return { error: "Failed to update list" };
  }
};

export const deleteList = async (formData: FormData) => {
  try {
    const id = formData.get("id") as string;
    const category = (formData.get("category") as string) || "Uncategorized";

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { error: "Not authenticated" };
    }

    const isAdminUser = await isAdmin();
    const lists = await (isAdminUser ? getAllLists() : getLists());
    if (!lists.success || !lists.data) {
      return { error: "Failed to fetch lists" };
    }

    const list = lists.data.find((l) => l.id === id && l.category === category);
    if (!list) {
      return { error: "List not found" };
    }

    let filePath: string;

    if (list.isShared) {
      if (!currentUser.isAdmin && currentUser.username !== list.owner) {
        return { error: "Unauthorized to delete this shared item" };
      }

      const ownerDir = path.join(
        process.cwd(),
        "data",
        CHECKLISTS_FOLDER,
        list.owner!
      );
      filePath = path.join(ownerDir, category, `${id}.md`);
    } else {
      const userDir = await getUserModeDir(Modes.CHECKLISTS);
      filePath = path.join(userDir, category, `${id}.md`);
    }

    await serverDeleteFile(filePath);

    try {
      const itemKey = `${list.category || "Uncategorized"}/${id}`;
      await removeItemFromIndex(list.owner!, ItemTypes.CHECKLIST, itemKey);
    } catch (error) {
      console.warn("Failed to remove checklist from link index:", id, error);
    }

    if (list.owner) {
      const { updateSharingData } = await import(
        "@/app/_server/actions/sharing"
      );
      await updateSharingData(
        {
          id,
          category: list.category || "Uncategorized",
          itemType: ItemTypes.CHECKLIST,
          sharer: list.owner,
        },
        null
      );
    }

    try {
      revalidatePath("/");
      const categoryPath = buildCategoryPath(
        list.category || "Uncategorized",
        id
      );
      revalidatePath(`/checklist/${categoryPath}`);
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error
      );
    }
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete list" };
  }
};

export const convertChecklistType = async (formData: FormData) => {
  try {
    const listId = formData.get("listId") as string;
    const newType = formData.get("newType") as ChecklistType;
    const category = formData.get("category") as string;

    if (!listId || !newType) {
      return { error: "List ID and type are required" };
    }

    const lists = await getLists();
    if (!lists.success || !lists.data) {
      throw new Error(lists.error || "Failed to fetch lists");
    }

    const list = lists.data.find(
      (l) => l.id === listId && l.category === category
    );
    if (!list) {
      throw new Error("List not found");
    }

    if (list.type === newType) {
      return { success: true };
    }

    let filePath: string;

    if (list.isShared) {
      const ownerDir = path.join(
        process.cwd(),
        "data",
        CHECKLISTS_FOLDER,
        list.owner!
      );
      filePath = path.join(
        ownerDir,
        list.category || "Uncategorized",
        `${listId}.md`
      );
    } else {
      const userDir = await getUserModeDir(Modes.CHECKLISTS);
      filePath = path.join(
        userDir,
        list.category || "Uncategorized",
        `${listId}.md`
      );
    }

    let convertedItems: any[];

    if (newType === "task") {
      convertedItems = list.items.map((item) => ({
        ...item,
        status: item.completed ? TaskStatus.COMPLETED : TaskStatus.TODO,
        timeEntries: [],
      }));
    } else {
      convertedItems = list.items.map((item) => ({
        id: item.id,
        text: item.text,
        completed: item.completed,
        order: item.order,
      }));
    }

    const updatedList = {
      ...list,
      type: newType,
      items: convertedItems,
      updatedAt: new Date().toISOString(),
    };

    await serverWriteFile(filePath, listToMarkdown(updatedList));

    try {
      revalidatePath("/");
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error
      );
    }
    return { success: true, data: updatedList };
  } catch (error) {
    console.error("Error converting checklist type:", error);
    return { error: "Failed to convert checklist type" };
  }
};
