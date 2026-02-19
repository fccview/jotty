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
import {
  extractChecklistType,
  generateUuid,
  updateYamlMetadata,
} from "@/app/_utils/yaml-metadata-utils";
import { readListsRecursively, type ChecklistReadResult } from "./readers";
import { checkAndRefreshRecurringItems } from "./parsers";
import { isDebugFlag } from "@/app/_utils/env-utils";
import {
  getOrCompute,
  metaCacheKey,
} from "@/app/_server/lib/metadata-cache";

export const getUserChecklists = async (options: GetChecklistsOptions = {}) => {
  const {
    username,
    allowArchived = false,
    isRaw = false,
    projection,
    metadataOnly = false,
    filter,
    limit,
    offset,
    pinnedPaths,
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

    const layoutTiming = metadataOnly;
    const t1 = layoutTiming ? performance.now() : 0;

    const canCache = metadataOnly && !allowArchived && !isRaw;
    const absUserDir = path.isAbsolute(userDir)
      ? userDir
      : path.join(process.cwd(), userDir);
    const ownCacheKey = canCache ? metaCacheKey("lists", absUserDir) : null;

    let lists: ChecklistReadResult[] = ownCacheKey
      ? await getOrCompute(ownCacheKey, absUserDir, () =>
          readListsRecursively(
            userDir,
            "",
            currentUser.username,
            allowArchived,
            isRaw,
            metadataOnly,
            undefined,
            undefined,
          ),
        )
      : await readListsRecursively(
          userDir,
          "",
          currentUser.username,
          allowArchived,
          isRaw,
          metadataOnly,
          undefined,
          undefined,
        );

    if (layoutTiming && isDebugFlag("crud")) {
      console.warn(
        `[layout checklists] readListsRecursively: ${(performance.now() - t1).toFixed(0)}ms`,
      );
    }

    const t2 = layoutTiming ? performance.now() : 0;
    const { getAllSharedItemsForUser } =
      await import("@/app/_server/actions/sharing");
    const sharedData = await getAllSharedItemsForUser(currentUser.username);
    if (layoutTiming && isDebugFlag("crud")) {
      console.warn(
        `[layout checklists] sharedItems: ${(performance.now() - t2).toFixed(0)}ms`,
      );
    }

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

        const sharerCacheKey = canCache
          ? metaCacheKey("lists", sharerDir)
          : null;

        const sharerLists = sharerCacheKey
          ? await getOrCompute(sharerCacheKey, sharerDir, () =>
              readListsRecursively(
                sharerDir,
                "",
                sharedItem.sharer,
                allowArchived,
                isRaw,
                metadataOnly,
              ),
            )
          : await readListsRecursively(
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

    if (filter) {
      if (filter.type === "category") {
        lists = lists.filter((list: any) => {
          const listCategory = list.category || "Uncategorized";
          return (
            listCategory === filter.value ||
            listCategory.startsWith(filter.value + "/")
          );
        });
      } else if (filter.type === "tag") {
        lists = lists.filter((list: any) => {
          const listTags = list.tags || [];
          return listTags.some(
            (tag: string) =>
              tag === filter.value || tag.startsWith(filter.value + "/"),
          );
        });
      }
    }

    if (!preserveOrder) {
      lists.sort(
        (a: any, b: any) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    }

    const limitNum = typeof limit === "number" && limit > 0 ? limit : undefined;
    const offsetNum = typeof offset === "number" && offset >= 0 ? offset : 0;

    if (
      !filter &&
      pinnedPaths &&
      pinnedPaths.length > 0 &&
      limitNum !== undefined
    ) {
      const pathMatches = (list: ChecklistReadResult, p: string) => {
        const c = list.category || "Uncategorized";
        const u = (list as { uuid?: string }).uuid || list.id;
        return `${c}/${u}` === p || `${c}/${list.id}` === p;
      };
      const pinned: ChecklistReadResult[] = [];
      for (const p of pinnedPaths) {
        const found = lists.find((l) => pathMatches(l, p));
        if (found) pinned.push(found);
      }
      const rest = lists.filter(
        (l) => !pinnedPaths.some((p) => pathMatches(l, p)),
      );
      lists = [...pinned, ...rest].slice(0, limitNum);
    } else if (limitNum !== undefined) {
      lists = lists.slice(offsetNum, offsetNum + limitNum);
    } else if (offsetNum > 0) {
      lists = lists.slice(offsetNum);
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
          const { checklist } = await checkAndRefreshRecurringItems(
            list as Checklist,
          );
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
  const { grepFindFileByUuid } = await import("@/app/_utils/grep-utils");
  const { serverReadFile } = await import("@/app/_server/actions/file");

  if (!username) {
    const { getUserByChecklistUuid } =
      await import("@/app/_server/actions/users");
    const userByUuid = await getUserByChecklistUuid(id);
    if (userByUuid.success && userByUuid.data) {
      username = userByUuid.data.username;
    } else {
      return undefined;
    }
  }

  let ownerUsername = username;
  const absUserDir = path.join(
    process.cwd(),
    "data",
    CHECKLISTS_FOLDER,
    username,
  );
  let filePath: string | null = null;
  let listId = id;
  let listCategory = category || "Uncategorized";
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  if (isUuid) {
    const found = await grepFindFileByUuid(absUserDir, id);
    if (found) {
      filePath = found.filePath;
      listId = found.id;
      listCategory = found.category;
    }
  }

  if (!filePath && category) {
    const directPath = path.join(absUserDir, category, `${id}.md`);
    try {
      await fs.access(directPath);
      filePath = directPath;
    } catch {
      if (unarchive) {
        const archivedPath = path.join(
          absUserDir,
          ".archive",
          category,
          `${id}.md`,
        );
        try {
          await fs.access(archivedPath);
          filePath = archivedPath;
          listCategory = `.archive/${category}`;
        } catch {}
      }
    }
  }

  let isShared = false;

  if (!filePath) {
    const { getAllSharedItemsForUser } =
      await import("@/app/_server/actions/sharing");
    const sharedData = await getAllSharedItemsForUser(username);
    for (const sharedItem of sharedData.checklists) {
      const itemIdentifier = sharedItem.uuid || sharedItem.id;
      if (!itemIdentifier) continue;

      const sharerDir = path.join(
        process.cwd(),
        "data",
        CHECKLISTS_FOLDER,
        sharedItem.sharer,
      );
      const found = isUuid && (await grepFindFileByUuid(sharerDir, id));

      if (found) {
        filePath = found.filePath;
        listId = found.id;
        listCategory = found.category;
        isShared = true;
        ownerUsername = sharedItem.sharer;
        break;
      }

      if (!isUuid && category) {
        const sharedPath = path.join(sharerDir, category, `${id}.md`);
        try {
          await fs.access(sharedPath);
          filePath = sharedPath;
          isShared = true;
          ownerUsername = sharedItem.sharer;
          break;
        } catch {}
      }
    }
  }

  if (!filePath) {
    return undefined;
  }

  const rawContent = await serverReadFile(filePath);
  if (!rawContent) return undefined;

  const stats = await fs.stat(filePath);
  const parsedData = parseChecklistContent(rawContent, listId);
  const checklistType = extractChecklistType(rawContent) || "task";

  let finalUuid = parsedData.uuid;
  if (!finalUuid) {
    finalUuid = generateUuid();
    try {
      const updatedContent = updateYamlMetadata(rawContent, {
        uuid: finalUuid,
        title: parsedData.title || listId.replace(/-/g, " "),
        checklistType: checklistType,
      });
      await fs.writeFile(filePath, updatedContent, "utf-8");
    } catch (error) {
      console.warn("Failed to save UUID to checklist file:", error);
    }
  }

  return {
    id: listId,
    uuid: finalUuid,
    title: parsedData.title,
    type: checklistType as Checklist["type"],
    items: parsedData.items,
    category: listCategory,
    createdAt: stats.birthtime.toISOString(),
    updatedAt: stats.mtime.toISOString(),
    owner: ownerUsername,
    isShared,
    ...(parsedData.statuses && { statuses: parsedData.statuses }),
  };
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
        allLists.push(...(userLists as Checklist[]));
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
  filter?: { type: "category" | "tag"; value: string } | null,
  limit: number = 20,
  offset: number = 0,
) => {
  return getUserChecklists({
    filter: filter || undefined,
    limit,
    offset: filter ? offset : undefined,
  });
};
