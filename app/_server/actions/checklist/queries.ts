"use server";

import path from "path";
import fs from "fs/promises";
import { Checklist, User, GetChecklistsOptions } from "@/app/_types";
import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";
import { USERS_FILE } from "@/app/_consts/files";
import { Modes } from "@/app/_types/enums";
import { getCurrentUser } from "@/app/_server/actions/users";
import { getUserModeDir, ensureDir } from "@/app/_server/actions/file";
import { readJsonFile } from "@/app/_server/actions/file";
import { parseChecklistContent } from "@/app/_utils/client-parser-utils";
import { decodeCategoryPath } from "@/app/_utils/global-utils";
import {
  extractChecklistType,
  generateUuid,
  updateYamlMetadata,
} from "@/app/_utils/yaml-metadata-utils";
import { readListsRecursively } from "./readers";
import { checkAndRefreshRecurringItems } from "./parsers";

export const getUserChecklists = async (options: GetChecklistsOptions = {}) => {
  const {
    username,
    allowArchived = false,
    isRaw = false,
    projection,
    metadataOnly = false,
    filter,
    limit,
    preserveOrder = false,
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
      isRaw,
      metadataOnly,
    );

    const { getAllSharedItemsForUser } =
      await import("@/app/_server/actions/sharing");
    const sharedData = await getAllSharedItemsForUser(currentUser.username);

    for (const sharedItem of sharedData.checklists) {
      try {
        const itemIdentifier = sharedItem.uuid || sharedItem.id;
        if (!itemIdentifier) continue;

        const sharerDir = path.join(
          process.cwd(),
          "data",
          CHECKLISTS_FOLDER,
          sharedItem.sharer,
        );
        await ensureDir(sharerDir);
        const sharerLists = await readListsRecursively(
          sharerDir,
          "",
          sharedItem.sharer,
          allowArchived,
          isRaw,
          metadataOnly,
        );
        const sharedChecklist = sharerLists.find(
          (list) => list.uuid === itemIdentifier || list.id === itemIdentifier,
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
          error,
        );
        continue;
      }
    }

    if (filter && filter.type === "category") {
      lists = lists.filter((list: any) => {
        const listCategory = list.category || "Uncategorized";
        return (
          listCategory === filter.value ||
          listCategory.startsWith(filter.value + "/")
        );
      });
    }

    if (!preserveOrder) {
      lists.sort(
        (a: any, b: any) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    }

    const limitNum = typeof limit === "number" && limit > 0 ? limit : undefined;
    if (limitNum !== undefined) {
      lists = lists.slice(0, limitNum);
    }

    if (metadataOnly) {
      lists = lists.map((list: any) => ({ ...list, items: [] }));
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

    if (!metadataOnly && !isRaw) {
      lists = await Promise.all(
        lists.map(async (list) => {
          const { checklist } = await checkAndRefreshRecurringItems(list);
          return checklist;
        }),
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
  unarchive?: boolean,
): Promise<Checklist | undefined> => {
  if (!username) {
    const { getUserByChecklistUuid } =
      await import("@/app/_server/actions/users");
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
          decodeCategoryPath(category).toLowerCase()),
  );

  if (list && "rawContent" in list) {
    const parsedData = parseChecklistContent(
      (list as any).rawContent,
      list.id!,
    );
    const checklistType =
      extractChecklistType((list as any).rawContent) || "task";
    const existingUuid = parsedData.uuid || list.uuid;

    let finalUuid = existingUuid;
    if (!finalUuid && username) {
      finalUuid = generateUuid();

      try {
        const updatedContent = updateYamlMetadata((list as any).rawContent, {
          uuid: finalUuid,
          title: parsedData.title || list.id?.replace(/-/g, " "),
          checklistType: checklistType,
        });

        const dataDir = path.join(process.cwd(), "data");
        const userDir = path.join(dataDir, CHECKLISTS_FOLDER, username);
        const decodedCategory = decodeURIComponent(
          list.category || "Uncategorized",
        );
        const categoryDir = path.join(userDir, decodedCategory);
        const filePath = path.join(categoryDir, `${list.id}.md`);

        await fs.writeFile(filePath, updatedContent, "utf-8");
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
  isRaw: boolean = false,
) => {
  try {
    const allLists: Checklist[] = [];

    const users: User[] = await readJsonFile(USERS_FILE);

    for (const user of users) {
      const userDir = path.join(
        process.cwd(),
        "data",
        CHECKLISTS_FOLDER,
        user.username,
      );

      try {
        const userLists = await readListsRecursively(
          userDir,
          "",
          user.username,
          allowArchived,
          isRaw,
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

export const getChecklistsForDisplay = async (
  filter?: { type: "category"; value: string } | null,
  limit: number = 20,
) => {
  return getUserChecklists({
    filter: filter || undefined,
    limit: filter ? undefined : limit,
  });
};
