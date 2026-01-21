"use server";

import path from "path";
import { Checklist, Item, User } from "@/app/_types";
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
import {
  generateUuid,
  generateYamlFrontmatter,
  extractChecklistType,
  updateYamlMetadata,
} from "@/app/_utils/yaml-metadata-utils";
import { extractYamlMetadata } from "@/app/_utils/yaml-metadata-utils";
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
  encodeCategoryPath,
  getFormData,
} from "@/app/_utils/global-utils";
import {
  updateIndexForItem,
  parseInternalLinks,
  removeItemFromIndex,
  updateItemCategory,
  rebuildLinkIndex,
} from "@/app/_server/actions/link";
import {
  shouldRefreshRecurringItem,
  refreshRecurringItem,
} from "@/app/_utils/recurrence-utils";
import { parseChecklistContent } from "@/app/_utils/client-parser-utils";
import { checkUserPermission } from "@/app/_server/actions/sharing";
import { logContentEvent } from "@/app/_server/actions/log";

interface GetChecklistsOptions {
  username?: string;
  allowArchived?: boolean;
  isRaw?: boolean;
  projection?: string[];
}

const getChecklistType = (content: string): ChecklistType => {
  if (content.includes("checklistType: task")) {
    return "task";
  }

  return "simple";
};

const readListsRecursively = async (
  dir: string,
  basePath: string = "",
  owner: string,
  allowArchived?: boolean,
  isRaw: boolean = false
): Promise<any[]> => {
  const lists: any[] = [];
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

          if (isRaw) {
            const { metadata } = extractYamlMetadata(content);
            const type = getChecklistType(content);
            let uuid = metadata.uuid;
            if (!uuid) {
              uuid = generateUuid();
              try {
                const updatedContent = updateYamlMetadata(content, { uuid });
                await serverWriteFile(filePath, updatedContent);
              } catch (error) {
                console.warn("Failed to save UUID to checklist file:", error);
              }
            }
            const rawList: Checklist & { rawContent: string } = {
              id,
              title: id,
              uuid,
              type,
              category: categoryPath,
              items: [],
              createdAt: stats.birthtime.toISOString(),
              updatedAt: stats.mtime.toISOString(),
              owner: owner,
              isShared: false,
              rawContent: content,
            };
            lists.push(rawList);
          } else {
            const parsedList = parseMarkdown(
              content,
              id,
              categoryPath,
              owner,
              false,
              stats,
              fileName
            );
            lists.push(parsedList);
          }
        } catch { }
      }
    } catch { }

    const subLists = await readListsRecursively(
      categoryDir,
      categoryPath,
      owner,
      allowArchived,
      isRaw
    );
    lists.push(...subLists);
  }

  return lists;
};

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

export const getUserChecklists = async (options: GetChecklistsOptions = {}) => {
  const {
    username,
    allowArchived = false,
    isRaw = false,
    projection,
  } = options;

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

    let lists: any[] = await readListsRecursively(
      userDir,
      "",
      currentUser.username,
      allowArchived,
      isRaw
    );

    const { getAllSharedItemsForUser } = await import(
      "@/app/_server/actions/sharing"
    );
    const sharedData = await getAllSharedItemsForUser(currentUser.username);

    for (const sharedItem of sharedData.checklists) {
      try {
        const itemIdentifier = sharedItem.uuid || sharedItem.id;
        if (!itemIdentifier) continue;

        const sharedChecklist = await getListById(
          itemIdentifier,
          sharedItem.sharer
        );

        if (sharedChecklist) {
          lists.push({
            ...sharedChecklist,
            isShared: true,
          });
        }
      } catch (error) {
        console.error(
          `Error reading shared checklist ${sharedItem.uuid || sharedItem.id}:`,
          error
        );
        continue;
      }
    }

    if (projection && projection.length > 0) {
      const projectedLists = lists.map((list: any) => {
        const projectedList: Partial<Checklist> = {};
        for (const key of projection) {
          if (Object.prototype.hasOwnProperty.call(list, key)) {
            (projectedList as any)[key] = (list as any)[key];
          }
        }
        return projectedList;
      });
      return { success: true, data: projectedLists };
    }

    if (!isRaw) {
      lists = await Promise.all(
        lists.map(async (list) => {
          const { checklist } = await checkAndRefreshRecurringItems(list);
          return checklist;
        })
      );
    }

    const serializedLists = lists.map((list) => ({
      ...list,
      statuses: list.statuses
        ? JSON.parse(JSON.stringify(list.statuses))
        : undefined,
    }));

    return { success: true, data: serializedLists as Checklist[] };
  } catch (error) {
    console.error("Error in getUserChecklists:", error);
    return { success: false, error: "Failed to fetch lists" };
  }
};

export const getListById = async (
  id: string,
  username?: string,
  category?: string,
  unarchive?: boolean
): Promise<Checklist | undefined> => {
  if (!username) {
    const { getUserByChecklistUuid } = await import(
      "@/app/_server/actions/users"
    );
    const userByUuid = await getUserByChecklistUuid(id);
    if (userByUuid.success && userByUuid.data) {
      username = userByUuid.data.username;
    }
  }

  const lists = await (username
    ? getUserChecklists({ username, allowArchived: unarchive, isRaw: true })
    : getAllLists(unarchive, true));

  if (!lists.success || !lists.data) {
    throw new Error(lists.error || "Failed to fetch lists");
  }

  const list = lists.data.find(
    (list) =>
      (list.id === id || list.uuid === id) &&
      (!category ||
        list.category?.toLowerCase() ===
        decodeCategoryPath(category).toLowerCase())
  );

  if (list && "rawContent" in list) {
    const parsedData = parseChecklistContent(
      (list as any).rawContent,
      list.id!
    );
    const checklistType =
      extractChecklistType((list as any).rawContent) || "task";
    const existingUuid = parsedData.uuid || list.uuid;

    let finalUuid = existingUuid;
    if (!finalUuid && username) {
      const { generateUuid, updateYamlMetadata } = await import(
        "@/app/_utils/yaml-metadata-utils"
      );
      finalUuid = generateUuid();

      try {
        const updatedContent = updateYamlMetadata((list as any).rawContent, {
          uuid: finalUuid,
          title: parsedData.title || list.id?.replace(/-/g, " "),
          checklistType: checklistType,
        });

        const fs = await import("fs/promises");
        const path = await import("path");

        const dataDir = path.join(process.cwd(), "data");
        if (username) {
          const userDir = path.join(dataDir, CHECKLISTS_FOLDER, username);
          const decodedCategory = decodeURIComponent(
            list.category || "Uncategorized"
          );
          const categoryDir = path.join(userDir, decodedCategory);
          const filePath = path.join(categoryDir, `${list.id}.md`);

          await fs.writeFile(filePath, updatedContent, "utf-8");
        }
      } catch (error) {
        console.warn("Failed to save UUID to checklist file:", error);
      }
    }

    const result = {
      ...list,
      title: parsedData.title,
      items: parsedData.items,
      uuid: finalUuid,
      ...(parsedData.statuses && { statuses: parsedData.statuses }),
    };
    return result as Checklist;
  }

  return list as Checklist | undefined;
};

export const getAllLists = async (
  allowArchived?: boolean,
  isRaw: boolean = false
) => {
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
          allowArchived,
          isRaw
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
    const userParam = formData.get("user") as string | null;

    let username: string | undefined;
    if (userParam) {
      try {
        const parsedUser = JSON.parse(userParam);
        username = parsedUser.username;
      } catch {
        username = undefined;
      }
    }

    const userDir = username
      ? path.join(process.cwd(), "data", CHECKLISTS_FOLDER, username)
      : await getUserModeDir(Modes.CHECKLISTS);
    const categoryDir = path.join(userDir, category);
    await ensureDir(categoryDir);

    const currentUser = await getCurrentUser();
    const fileRenameMode = currentUser?.fileRenameMode || "minimal";
    const filename = await generateUniqueFilename(
      categoryDir,
      title,
      ".md",
      fileRenameMode
    );
    const id = path.basename(filename, ".md");
    const filePath = path.join(categoryDir, filename);

    const newList: Checklist = {
      id,
      uuid: generateUuid(),
      title,
      type,
      category,
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      owner: username,
    };

    await serverWriteFile(filePath, listToMarkdown(newList));

    try {
      const content = newList.items.map((i) => i.text).join("\n");
      const links = await parseInternalLinks(content);
      const indexUsername = username || (await getCurrentUser())?.username;
      if (indexUsername) {
        await updateIndexForItem(
          indexUsername,
          ItemTypes.CHECKLIST,
          newList.uuid!,
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

    await logContentEvent(
      "checklist_created",
      "checklist",
      newList.uuid!,
      newList.title,
      true,
      { category: newList.category }
    );

    return { success: true, data: newList };
  } catch (error) {
    const { title, uuid } = getFormData(formData, ["title", "uuid"]);
    await logContentEvent(
      "checklist_created",
      "checklist",
      uuid!,
      title || "unknown",
      false
    );
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
    const ownerUsername = formData.get("user") as string | null;
    const unarchive = formData.get("unarchive") as string;
    const apiUser = formData.get("apiUser") as string | null;

    let actingUser = await getCurrentUser();
    if (!actingUser && apiUser) {
      try {
        actingUser = JSON.parse(apiUser);
      } catch {
        return { error: "Invalid user data" };
      }
    }

    if (!actingUser || !actingUser.username) {
      return { error: "Not authenticated" };
    }

    const currentList = await getListById(
      id,
      ownerUsername || undefined,
      originalCategory,
      unarchive === "true"
    );

    if (!currentList) {
      throw new Error("List not found");
    }

    const canEdit = await checkUserPermission(
      id,
      originalCategory,
      ItemTypes.CHECKLIST,
      actingUser.username,
      PermissionTypes.EDIT
    );

    if (!canEdit) {
      return { error: "Permission denied" };
    }

    const updatedList: Checklist = {
      ...currentList,
      title,
      category: category || currentList.category,
      items: currentList.items,
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

    const fileRenameMode = actingUser?.fileRenameMode || "minimal";
    const sanitizedTitle = sanitizeFilename(title, fileRenameMode);
    const currentFilename = `${id}.md`;
    const expectedFilename = `${sanitizedTitle}.md`;

    if (title !== currentList.title || currentFilename !== expectedFilename) {
      newFilename = await generateUniqueFilename(
        categoryDir,
        title,
        ".md",
        fileRenameMode
      );
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
      const links = await parseInternalLinks(content);
      const newItemKey = `${updatedList.category || "Uncategorized"}/${updatedList.id
        }`;

      const oldItemKey = `${currentList.category || "Uncategorized"}/${id}`;
      if (oldItemKey !== newItemKey) {
        await rebuildLinkIndex(currentList.owner!);
        revalidatePath("/");
      }

      await updateIndexForItem(
        currentList.owner!,
        ItemTypes.CHECKLIST,
        updatedList.uuid!,
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
        currentList.category || "UncategorCgorized",
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

    await logContentEvent(
      "checklist_updated",
      "checklist",
      updatedList.uuid!,
      updatedList.title,
      true,
      { category: updatedList.category }
    );

    return { success: true, data: updatedList };
  } catch (error) {
    try {
      const { title, uuid } = getFormData(formData, ["title", "uuid"]);
      await logContentEvent(
        "checklist_updated",
        "checklist",
        uuid!,
        title || "unknown",
        false
      );
    } catch { }
    return { error: "Failed to update list" };
  }
};

export const deleteList = async (formData: FormData) => {
  try {
    const id = formData.get("id") as string;
    const category = (formData.get("category") as string) || "Uncategorized";
    const uuid = formData.get("uuid") as string | null;
    const apiUser = formData.get("apiUser") as string | null;
    const itemIdentifier = uuid || id;

    let currentUser = await getCurrentUser();
    if (!currentUser && apiUser) {
      try {
        currentUser = JSON.parse(apiUser);
      } catch {
        return { error: "Invalid user data" };
      }
    }

    if (!currentUser) {
      return { error: "Not authenticated" };
    }

    const list = await getListById(
      itemIdentifier,
      currentUser.username,
      category
    );

    if (!list) {
      return { error: "List not found" };
    }

    const canDelete = await checkUserPermission(
      itemIdentifier,
      category,
      ItemTypes.CHECKLIST,
      currentUser.username,
      PermissionTypes.DELETE
    );

    if (!canDelete) {
      return { error: "Permission denied" };
    }

    const ownerUsername = list.owner || currentUser.username;
    const ownerDir = path.join(
      process.cwd(),
      "data",
      CHECKLISTS_FOLDER,
      ownerUsername
    );
    const filePath = path.join(
      ownerDir,
      list.category || "Uncategorized",
      `${list.id}.md`
    );

    await serverDeleteFile(filePath);

    try {
      await removeItemFromIndex(list.owner!, ItemTypes.CHECKLIST, list.uuid!);
    } catch (error) {
      console.warn(
        "Failed to remove checklist from link index:",
        list.id,
        error
      );
    }

    if (list.owner) {
      const { updateSharingData } = await import(
        "@/app/_server/actions/sharing"
      );
      await updateSharingData(
        {
          id: list.id,
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
        list.id
      );
      revalidatePath(`/checklist/${categoryPath}`);
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error
      );
    }
    await logContentEvent(
      "checklist_deleted",
      "checklist",
      list.uuid || "unknown",
      list.title || "unknown",
      true,
      { category: list.category }
    );
    return { success: true };
  } catch (error) {
    try {
      const { title, uuid } = getFormData(formData, ["title", "uuid"]);
      await logContentEvent(
        "checklist_deleted",
        "checklist",
        uuid || "unknown",
        title || "unknown",
        false
      );
    } catch { }
    return { error: "Failed to delete list" };
  }
};

export const convertChecklistType = async (formData: FormData) => {
  try {
    const {
      listId,
      newType: type,
      uuid,
    } = getFormData(formData, ["listId", "newType", "uuid"]);
    const newType = type as ChecklistType;

    if (!listId || !newType) {
      return { error: "List ID and type are required" };
    }

    let list = await getListById(uuid);

    if (!list) {
      const lists = await getUserChecklists();

      if (!lists.success || !lists.data) {
        throw new Error(lists.error || "Failed to fetch lists");
      }

      list = lists.data.find((l) => l.uuid === uuid) as Checklist;
    }

    if (!list || !list.id || !list.createdAt) {
      throw new Error("List not found or is malformed");
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
      convertedItems = (list.items || []).map((item) => ({
        ...item,
        status:
          item.status ||
          (item.completed ? TaskStatus.COMPLETED : TaskStatus.TODO),
        timeEntries: item.timeEntries || [],
      }));
    } else {
      convertedItems = (list.items || []).map((item) => ({
        ...item,
      }));
    }

    const updatedList: Checklist = {
      id: list.id,
      uuid: list.uuid,
      title: list.title || "",
      category: list.category,
      createdAt: list.createdAt,
      owner: list.owner,
      isShared: list.isShared,
      isDeleted: list.isDeleted,
      type: newType,
      items: convertedItems as Item[],
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

export const updateChecklistStatuses = async (formData: FormData) => {
  try {
    const { uuid, statusesStr } = getFormData(formData, [
      "uuid",
      "statusesStr",
    ]);

    if (!uuid || !statusesStr) {
      console.error("Missing uuid or statusesStr");
      return { error: "UUID and statuses are required" };
    }

    const lists = await getUserChecklists();
    if (!lists.success || !lists.data) {
      console.error("Failed to fetch lists:", lists.error);
      throw new Error(lists.error || "Failed to fetch lists");
    }

    const list = lists.data.find((l) => l.uuid === uuid) as Checklist;

    if (!list || !list.id || !list.createdAt) {
      console.error("List not found or malformed:", { list });
      throw new Error("List not found or is malformed");
    }

    const statuses = JSON.parse(statusesStr);

    const oldStatusIds = (list.statuses || []).map((s) => s.id);
    const newStatusIds = statuses.map((s: any) => s.id);
    const removedStatusIds = oldStatusIds.filter(
      (id) => !newStatusIds.includes(id)
    );

    const sortedStatuses = [...statuses].sort(
      (a: any, b: any) => a.order - b.order
    );
    const firstStatus = sortedStatuses[0];
    const defaultStatusId = firstStatus?.id || "todo";

    const currentUser = await getCurrentUser();
    const username = currentUser?.username;
    if (!username) {
      throw new Error("Username not found");
    }

    const now = new Date().toISOString();
    const updatedItems = list.items.map((item) => {
      if (removedStatusIds.includes(item.status || "")) {
        const history = item.history || [];
        history.push({
          status: defaultStatusId,
          timestamp: now,
          user: username,
        });

        return {
          ...item,
          status: defaultStatusId,
          lastModifiedBy: username,
          lastModifiedAt: now,
          history,
        };
      }
      return item;
    });

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
        `${list.id}.md`
      );
    } else {
      const userDir = await getUserModeDir(Modes.CHECKLISTS);
      filePath = path.join(
        userDir,
        list.category || "Uncategorized",
        `${list.id}.md`
      );
    }

    const updatedList: Checklist = {
      ...list,
      items: updatedItems,
      statuses,
      updatedAt: new Date().toISOString(),
    };

    const markdown = listToMarkdown(updatedList);
    await serverWriteFile(filePath, markdown);

    try {
      revalidatePath("/", "layout");
      revalidatePath(`/checklist/${list.id}`);
      if (list.category) {
        revalidatePath(`/category/${list.category}`);
      }
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error
      );
    }
    return { success: true, data: updatedList };
  } catch (error) {
    console.error("Error updating checklist statuses:", error);
    return { error: "Failed to update checklist statuses" };
  }
};

export const cloneChecklist = async (formData: FormData) => {
  try {
    const id = formData.get("id") as string;
    const category = formData.get("category") as string;
    const ownerUsername = formData.get("user") as string | null;

    const checklist = await getListById(
      id,
      ownerUsername || undefined,
      category
    );
    if (!checklist) {
      return { error: "Checklist not found" };
    }

    const currentUser = await getCurrentUser();
    const userDir = await getUserModeDir(Modes.CHECKLISTS);

    const isOwnedByCurrentUser =
      !checklist.owner || checklist.owner === currentUser?.username;
    const targetCategory = isOwnedByCurrentUser
      ? category || "Uncategorized"
      : "Uncategorized";

    const categoryDir = path.join(userDir, targetCategory);
    await ensureDir(categoryDir);

    const cloneTitle = `${checklist.title} (Copy)`;
    const fileRenameMode = currentUser?.fileRenameMode || "minimal";
    const filename = await generateUniqueFilename(
      categoryDir,
      cloneTitle,
      ".md",
      fileRenameMode
    );
    const filePath = path.join(categoryDir, filename);

    const content = listToMarkdown(checklist);
    const updatedContent = updateYamlMetadata(content, {
      uuid: generateUuid(),
      title: cloneTitle,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await serverWriteFile(filePath, updatedContent);

    const newId = path.basename(filename, ".md");
    const clonedChecklist = await getListById(
      newId,
      currentUser?.username,
      targetCategory
    );

    try {
      revalidatePath("/");
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but checklist was cloned successfully:",
        error
      );
    }

    return { success: true, data: clonedChecklist };
  } catch (error) {
    console.error("Error cloning checklist:", error);
    return { error: "Failed to clone checklist" };
  }
};

export const clearAllChecklistItems = async (formData: FormData) => {
  try {
    const id = formData.get("id") as string;
    const category = formData.get("category") as string;
    const ownerUsername = formData.get("user") as string | null;
    const type = formData.get("type") as "completed" | "incomplete";
    const apiUser = formData.get("apiUser") as string | null;

    let actingUser = await getCurrentUser();
    if (!actingUser && apiUser) {
      try {
        actingUser = JSON.parse(apiUser);
      } catch {
        return { error: "Invalid user data" };
      }
    }

    if (!actingUser || !actingUser.username) {
      return { error: "Not authenticated" };
    }

    const checklist = await getListById(
      id,
      ownerUsername || undefined,
      category
    );

    if (!checklist) {
      return { error: "Checklist not found" };
    }

    const canEdit = await checkUserPermission(
      id,
      category,
      ItemTypes.CHECKLIST,
      actingUser.username,
      PermissionTypes.EDIT
    );

    if (!canEdit) {
      return { error: "Permission denied" };
    }

    const filteredItems = checklist.items.filter((item) => {
      if (type === "completed") {
        return !item.completed;
      } else {
        return item.completed;
      }
    });

    const updatedChecklist: Checklist = {
      ...checklist,
      items: filteredItems,
      updatedAt: new Date().toISOString(),
    };

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

    try {
      const content = updatedChecklist.items.map((i) => i.text).join("\n");
      const links = await parseInternalLinks(content);
      await updateIndexForItem(
        checklist.owner!,
        ItemTypes.CHECKLIST,
        updatedChecklist.uuid!,
        links
      );
    } catch (error) {
      console.warn(
        "Failed to update link index for checklist:",
        updatedChecklist.id,
        error
      );
    }

    try {
      revalidatePath("/");
      const categoryPath = buildCategoryPath(
        checklist.category || "Uncategorized",
        checklist.id
      );
      revalidatePath(`/checklist/${categoryPath}`);
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error
      );
    }

    return { success: true, data: updatedChecklist };
  } catch (error) {
    console.error("Error clearing checklist items:", error);
    return { error: "Failed to clear checklist items" };
  }
};
