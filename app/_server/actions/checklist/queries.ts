"use server";

import path from "path";
import fs from "fs/promises";
import { Checklist, User, GetChecklistsOptions } from "@/app/_types";
import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { USERS_FILE } from "@/app/_consts/files";
import { Modes, PermissionTypes } from "@/app/_types/enums";
import { getCurrentUser } from "@/app/_server/actions/users";
import { getUserModeDir, ensureDir } from "@/app/_server/actions/file";
import { readJsonFile } from "@/app/_server/actions/file";
import { parseChecklistContent } from "@/app/_utils/client-parser-utils";
import {
  extractChecklistType,
  toIso,
} from "@/app/_utils/yaml-metadata-utils";
import { readListsRecursively, type ChecklistReadResult } from "./readers";
import { mountsFor, mountedItems } from "@/app/_server/actions/share/mounts";
import { canReachFile } from "@/app/_server/actions/share/access";
import { checkAndRefreshRecurringItems } from "./parsers";
import { isDebugFlag } from "@/app/_utils/env-utils";
import { getOrCompute, metaCacheKey } from "@/app/_server/actions/lib/metadata-cache";

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
    const ownCacheKey = canCache
      ? metaCacheKey(Modes.CHECKLISTS, absUserDir)
      : null;

    const cached: ChecklistReadResult[] = ownCacheKey
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

    let lists: ChecklistReadResult[] = [...cached];

    if (layoutTiming && isDebugFlag("crud")) {
      console.warn(
        `[layout checklists] readListsRecursively: ${(performance.now() - t1).toFixed(0)}ms`,
      );
    }

    const t2 = layoutTiming ? performance.now() : 0;
    const mounts = await mountsFor(Modes.CHECKLISTS, currentUser.username);
    if (layoutTiming && isDebugFlag("crud")) {
      console.warn(
        `[layout checklists] mounts: ${(performance.now() - t2).toFixed(0)}ms`,
      );
    }

    for (const mount of mounts) {
      try {
        const ownerDir = path.join(
          process.cwd(),
          "data",
          CHECKLISTS_FOLDER,
          mount.owner,
        );
        await ensureDir(ownerDir);

        const ownerCacheKey = canCache
          ? metaCacheKey(Modes.CHECKLISTS, ownerDir)
          : null;

        const ownerLists = ownerCacheKey
          ? await getOrCompute(ownerCacheKey, ownerDir, () =>
            readListsRecursively(
              ownerDir,
              "",
              mount.owner,
              allowArchived,
              isRaw,
              metadataOnly,
            ),
          )
          : await readListsRecursively(
            ownerDir,
            "",
            mount.owner,
            allowArchived,
            isRaw,
            metadataOnly,
          );

        const shared = await mountedItems(
          Modes.CHECKLISTS,
          currentUser.username,
          mount,
          ownerLists,
        );

        lists.push(...shared);
      } catch (error) {
        console.error(
          `Error reading shared checklists from ${mount.owner}:`,
          error,
        );
        continue;
      }
    }

    if (filter) {
      if (filter.type === "category") {
        lists = lists.filter((list: any) => {
          const listCategory = list.category || UNCATEGORIZED;
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
        const u = (list as { uuid?: string }).uuid;
        return p === u || p.split("/").pop() === u;
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
  uuid: string,
  username?: string,
): Promise<Checklist | undefined> => {
  const { grepFindFileByUuid } = await import("@/app/_utils/grep-utils");
  const { serverReadFile } = await import("@/app/_server/actions/file");

  if (!username) {
    const { getUserByChecklistUuid } =
      await import("@/app/_server/actions/users");
    const userByUuid = await getUserByChecklistUuid(uuid);
    if (!userByUuid.success || !userByUuid.data) {
      return undefined;
    }
    username = userByUuid.data.username;
  }

  let ownerUsername = username;
  const absUserDir = path.join(
    process.cwd(),
    "data",
    CHECKLISTS_FOLDER,
    username,
  );
  let filePath: string | null = null;
  let listId = uuid;
  let listCategory = UNCATEGORIZED;

  const found = await grepFindFileByUuid(absUserDir, uuid);
  if (found) {
    filePath = found.filePath;
    listId = found.id;
    listCategory = found.category || UNCATEGORIZED;
  }

  let isShared = false;

  if (!filePath) {
    const mounts = await mountsFor(Modes.CHECKLISTS, username);

    for (const mount of mounts) {
      const ownerDir = path.join(
        process.cwd(),
        "data",
        CHECKLISTS_FOLDER,
        mount.owner,
      );
      const sharedFound = await grepFindFileByUuid(ownerDir, uuid);

      if (!sharedFound) continue;

      const allowed = await canReachFile(
        Modes.CHECKLISTS,
        sharedFound.filePath,
        username,
        PermissionTypes.READ,
      );

      if (!allowed) continue;

      filePath = sharedFound.filePath;
      listId = sharedFound.id;
      listCategory = sharedFound.category || UNCATEGORIZED;
      isShared = true;
      ownerUsername = mount.owner;
      break;
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

  return {
    id: listId,
    uuid: parsedData.uuid || uuid,
    title: parsedData.title,
    type: checklistType as Checklist["type"],
    items: parsedData.items,
    category: listCategory,
    createdAt: toIso(stats.birthtime),
    updatedAt: toIso(stats.mtime),
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
