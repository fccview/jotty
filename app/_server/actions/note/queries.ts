"use server";

import path from "path";
import fs from "fs/promises";
import { Note, User, GetNotesOptions } from "@/app/_types";
import { NOTES_DIR, USERS_FILE } from "@/app/_consts/files";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { Modes, PermissionTypes } from "@/app/_types/enums";
import { getCurrentUser } from "@/app/_server/actions/users";
import { getUserModeDir, ensureDir } from "@/app/_server/actions/file";
import { readJsonFile } from "@/app/_server/actions/file";
import { parseNoteContent } from "@/app/_utils/client-parser-utils";
import { toIso } from "@/app/_utils/yaml-metadata-utils";
import { readNotesRecursively } from "./readers";
import { mountsFor, mountedItems } from "@/app/_server/actions/share/mounts";
import { canReachFile } from "@/app/_server/actions/share/access";
import { isDebugFlag } from "@/app/_utils/env-utils";
import { getOrCompute, metaCacheKey } from "@/app/_server/actions/lib/metadata-cache";

export const getAllNotes = async (allowArchived?: boolean) => {
  try {
    const allDocs: Note[] = [];

    const users: User[] = await readJsonFile(USERS_FILE);

    for (const user of users) {
      const userDir = NOTES_DIR(user.username);

      try {
        const userDocs = await readNotesRecursively(
          userDir,
          "",
          user.username,
          allowArchived,
          false,
        );
        allDocs.push(...userDocs);
      } catch (error) {
        continue;
      }
    }

    return { success: true, data: allDocs };
  } catch (error) {
    console.error("Error in getAllNotes:", error);
    return { success: false, error: "Failed to fetch all notes" };
  }
};

export const getNoteById = async (
  uuid: string,
  username?: string,
): Promise<Note | undefined> => {
  const { grepFindFileByUuid } = await import("@/app/_utils/grep-utils");
  const { serverReadFile } = await import("@/app/_server/actions/file");

  if (!username) {
    const { getUserByNoteUuid } = await import("@/app/_server/actions/users");
    const userByUuid = await getUserByNoteUuid(uuid);

    if (!userByUuid.success || !userByUuid.data) {
      return undefined;
    }

    username = userByUuid.data.username;
  }

  let ownerUsername = username;
  const absUserDir = path.join(process.cwd(), NOTES_DIR(username));
  let filePath: string | null = null;
  let noteId = uuid;
  let noteCategory = UNCATEGORIZED;

  const found = await grepFindFileByUuid(absUserDir, uuid);
  if (found) {
    filePath = found.filePath;
    noteId = found.id;
    noteCategory = found.category || UNCATEGORIZED;
  }

  let isShared = false;

  if (!filePath) {
    const mounts = await mountsFor(Modes.NOTES, username);

    for (const mount of mounts) {
      const ownerDir = path.join(process.cwd(), NOTES_DIR(mount.owner));
      const sharedFound = await grepFindFileByUuid(ownerDir, uuid);

      if (!sharedFound) continue;

      const allowed = await canReachFile(
        Modes.NOTES,
        sharedFound.filePath,
        username,
        PermissionTypes.READ,
      );

      if (!allowed) continue;

      filePath = sharedFound.filePath;
      noteId = sharedFound.id;
      noteCategory = sharedFound.category || UNCATEGORIZED;
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
  const parsedData = parseNoteContent(rawContent, noteId);

  return {
    id: noteId,
    uuid: parsedData.uuid || uuid,
    title: parsedData.title,
    content: parsedData.content,
    category: noteCategory,
    createdAt: toIso(stats.birthtime),
    updatedAt: toIso(stats.mtime),
    owner: ownerUsername,
    isShared,
    encrypted: parsedData.encrypted || false,
    encryptionMethod: parsedData.encryptionMethod,
    tags: parsedData.tags || [],
    ...(parsedData.sharedWith !== undefined && {
      sharedWith: parsedData.sharedWith,
    }),
    ...(parsedData.extraMetadata && {
      extraMetadata: parsedData.extraMetadata,
    }),
  };
};

export const getUserNotes = async (options: GetNotesOptions = {}) => {
  const {
    username,
    allowArchived = false,
    isRaw = false,
    projection,
    metadataOnly = false,
    excerptLength,
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
      userDir = NOTES_DIR(username);
      currentUser = { username };
    } else {
      currentUser = await getCurrentUser();
      if (!currentUser) {
        return { success: false, error: "Not authenticated" };
      }
      userDir = await getUserModeDir(Modes.NOTES);
    }
    await ensureDir(userDir);

    const resolvedDir = path.isAbsolute(userDir)
      ? userDir
      : path.join(process.cwd(), userDir);

    const layoutTiming = metadataOnly;
    const t1 = layoutTiming ? performance.now() : 0;

    const canCache = metadataOnly && !allowArchived && !isRaw && !excerptLength;

    const ownCacheKey = canCache
      ? metaCacheKey(Modes.NOTES, resolvedDir)
      : null;

    const cached: Note[] = ownCacheKey
      ? await getOrCompute(ownCacheKey, resolvedDir, () =>
        readNotesRecursively(
          resolvedDir,
          "",
          currentUser.username,
          allowArchived,
          isRaw,
          metadataOnly,
          excerptLength,
          undefined,
          undefined,
        ),
      )
      : await readNotesRecursively(
        resolvedDir,
        "",
        currentUser.username,
        allowArchived,
        isRaw,
        metadataOnly,
        excerptLength,
        undefined,
        undefined,
      );

    const notes: Note[] = [...cached];

    if (layoutTiming && isDebugFlag("crud")) {
      console.warn(
        `[layout notes] readNotesRecursively: ${(performance.now() - t1).toFixed(0)}ms`,
      );
    }

    const t2 = layoutTiming ? performance.now() : 0;
    const mounts = await mountsFor(Modes.NOTES, currentUser.username);
    if (layoutTiming && isDebugFlag("crud")) {
      console.warn(
        `[layout notes] mounts: ${(performance.now() - t2).toFixed(0)}ms`,
      );
    }

    for (const mount of mounts) {
      try {
        const ownerDir = NOTES_DIR(mount.owner);
        await ensureDir(ownerDir);

        const ownerAbsDir = path.isAbsolute(ownerDir)
          ? ownerDir
          : path.join(process.cwd(), ownerDir);
        const ownerCacheKey = canCache
          ? metaCacheKey(Modes.NOTES, ownerAbsDir)
          : null;

        const ownerNotes = ownerCacheKey
          ? await getOrCompute(ownerCacheKey, ownerAbsDir, () =>
            readNotesRecursively(
              ownerDir,
              "",
              mount.owner,
              allowArchived,
              isRaw,
              metadataOnly,
              excerptLength,
            ),
          )
          : await readNotesRecursively(
            ownerDir,
            "",
            mount.owner,
            allowArchived,
            isRaw,
            metadataOnly,
            excerptLength,
          );

        const shared = await mountedItems(
          Modes.NOTES,
          currentUser.username,
          mount,
          ownerNotes,
        );

        notes.push(...shared);
      } catch (error) {
        console.error(
          `Error reading shared notes from ${mount.owner}:`,
          error,
        );
        continue;
      }
    }

    let filteredNotes = notes;
    if (filter) {
      if (filter.type === "category") {
        filteredNotes = notes.filter((note: any) => {
          const noteCategory = note.category || UNCATEGORIZED;
          return (
            noteCategory === filter.value ||
            noteCategory.startsWith(filter.value + "/")
          );
        });
      } else if (filter.type === "tag") {
        filteredNotes = notes.filter((note: any) => {
          const noteTags = note.tags || [];
          return noteTags.some(
            (tag: string) =>
              tag === filter.value || tag.startsWith(filter.value + "/"),
          );
        });
      }
    }

    if (!preserveOrder) {
      filteredNotes.sort(
        (a: any, b: any) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    }

    const offsetNum = typeof offset === "number" && offset >= 0 ? offset : 0;
    if (
      !filter &&
      pinnedPaths &&
      pinnedPaths.length > 0 &&
      limit &&
      limit > 0
    ) {
      const pathMatches = (note: { uuid?: string }, p: string) => {
        const u = note.uuid;
        return p === u || p.split("/").pop() === u;
      };
      const pinned: typeof filteredNotes = [];
      for (const p of pinnedPaths) {
        const found = filteredNotes.find((n: { uuid?: string }) =>
          pathMatches(n, p),
        );
        if (found) pinned.push(found);
      }
      const rest = filteredNotes.filter(
        (n: { category?: string; uuid?: string; id: string }) =>
          !pinnedPaths.some((p) => pathMatches(n, p)),
      );
      filteredNotes = [...pinned, ...rest].slice(0, limit);
    } else if (limit && limit > 0) {
      filteredNotes = filteredNotes.slice(offsetNum, offsetNum + limit);
    } else if (offsetNum > 0) {
      filteredNotes = filteredNotes.slice(offsetNum);
    }

    if (projection && projection.length > 0) {
      const projectedNotes = filteredNotes.map((note: any) => {
        const projectedNote: Partial<Note> = {};
        for (const key of projection) {
          if (Object.prototype.hasOwnProperty.call(note, key)) {
            (projectedNote as any)[key] = (note as any)[key];
          }
        }
        return projectedNote;
      });
      return { success: true, data: projectedNotes };
    }

    return { success: true, data: filteredNotes as Note[] };
  } catch (error) {
    console.error("Error in getNotesUnified:", error);
    return { success: false, error: "Failed to fetch notes" };
  }
};

export const getNotesForDisplay = async (
  filter?: { type: "category" | "tag"; value: string } | null,
  limit: number = 20,
  offset: number = 0,
) => {
  return getUserNotes({
    filter: filter || undefined,
    limit,
    offset: filter ? offset : undefined,
  });
};
