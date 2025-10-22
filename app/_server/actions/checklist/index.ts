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
import { getItemsSharedWithUser } from "@/app/_server/actions/sharing";
import { readJsonFile } from "../file";
import fs from "fs/promises";
import { parseMarkdown } from "@/app/_utils/checklist-utils";
import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";
import { USERS_FILE } from "@/app/_consts/files";
import { Modes, TaskStatus } from "@/app/_types/enums";
import { ChecklistType } from "@/app/_types";
import { generateUniqueFilename } from "@/app/_utils/filename-utils";
import { sanitizeFilename } from "@/app/_utils/filename-utils";
import { serverWriteFile } from "@/app/_server/actions/file";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { isAdmin } from "@/app/_server/actions/users";
import { serverDeleteFile } from "@/app/_server/actions/file";
import { revalidatePath } from "next/cache";
import {
  removeSharedItem,
  updateSharedItem,
} from "@/app/_server/actions/sharing";
import { buildCategoryPath } from "@/app/_utils/global-utils";

const readListsRecursively = async (
  dir: string,
  basePath: string = "",
  owner: string
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
        } catch {}
      }
    } catch {}

    const subLists = await readListsRecursively(
      categoryDir,
      categoryPath,
      owner
    );
    lists.push(...subLists);
  }
  return lists;
};

export const getLists = async (username?: string) => {
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

    const lists = await readListsRecursively(userDir, "", currentUser.username);

    const sharedItems = await getItemsSharedWithUser(currentUser.username);
    for (const sharedItem of sharedItems.checklists) {
      try {
        const sharedFilePath = sharedItem.filePath
          ? path.join(
              process.cwd(),
              "data",
              CHECKLISTS_FOLDER,
              sharedItem.filePath
            )
          : path.join(
              process.cwd(),
              "data",
              CHECKLISTS_FOLDER,
              sharedItem.owner,
              sharedItem.category || "Uncategorized",
              `${sharedItem.id}.md`
            );

        const content = await fs.readFile(sharedFilePath, "utf-8");
        const stats = await fs.stat(sharedFilePath);
        lists.push(
          parseMarkdown(
            content,
            sharedItem.id,
            sharedItem.category || "Uncategorized",
            sharedItem.owner,
            true,
            stats
          )
        );
      } catch (error) {
        continue;
      }
    }

    return { success: true, data: lists };
  } catch (error) {
    console.error("Error in getLists:", error);
    return { success: false, error: "Failed to fetch lists" };
  }
};

export const getListById = async (
  id: string,
  username?: string,
  category?: string
): Promise<Checklist | undefined> => {
  const lists = await (username ? getLists(username) : getAllLists());
  if (!lists.success || !lists.data) {
    throw new Error(lists.error || "Failed to fetch lists");
  }
  return lists.data.find(
    (list) => list.id === id && (!category || list.category === category)
  );
};

export const getAllLists = async () => {
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
          user.username
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

    const isAdminUser = await isAdmin();
    const lists = await (isAdminUser ? getAllLists() : getLists());
    if (!lists.success || !lists.data) {
      throw new Error(lists.error || "Failed to fetch lists");
    }

    const currentList = lists.data.find(
      (list) => list.id === id && list.category === category
    );
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

    const { getItemSharingMetadata } = await import(
      "@/app/_server/actions/sharing"
    );
    const sharingMetadata = await getItemSharingMetadata(
      id,
      "checklist",
      currentList.owner!
    );

    if (sharingMetadata) {
      const newFilePath = `${currentList.owner}/${
        updatedList.category || "Uncategorized"
      }/${updatedList.id}.md`;

      if (newId !== id) {
        const { removeSharedItem, addSharedItem } = await import(
          "@/app/_server/actions/sharing"
        );

        await removeSharedItem(id, "checklist", currentList.owner!);

        await addSharedItem(
          updatedList.id,
          "checklist",
          updatedList.title,
          currentList.owner!,
          sharingMetadata.sharedWith,
          updatedList.category,
          newFilePath,
          sharingMetadata.isPubliclyShared
        );
      } else {
        await updateSharedItem(
          updatedList.id,
          "checklist",
          currentList.owner!,
          {
            filePath: newFilePath,
            category: updatedList.category,
            title: updatedList.title,
          }
        );
      }
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

    if (list.isShared && list.owner) {
      await removeSharedItem(id, "checklist", list.owner);
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
