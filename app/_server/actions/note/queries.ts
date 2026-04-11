"use server";

import path from "path";
import fs from "fs/promises";
import { Note, User, GetNotesOptions } from "@/app/_types";
import { NOTES_DIR } from "@/app/_consts/files";
import { Modes } from "@/app/_types/enums";
import { getCurrentUser } from "@/app/_server/actions/users";
import { getUserModeDir, ensureDir } from "@/app/_server/actions/file";
import { readJsonFile } from "@/app/_server/actions/file";
import { USERS_FILE } from "@/app/_consts/files";
import { parseNoteContent } from "@/app/_utils/client-parser-utils";
import {
  generateUuid,
  toIso,
  updateYamlMetadata,
} from "@/app/_utils/yaml-metadata-utils";
import { readNotesRecursively } from "./readers";
import { isDebugFlag } from "@/app/_utils/env-utils";
import { getOrCompute, metaCacheKey } from "@/app/_server/lib/metadata-cache";

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
  ownerUsername?: string,
  actingUsername?: string,
  unarchive?: boolean,
): Promise<Note | undefined> => {
  const { grepFindFileByUuid } = await import("@/app/_utils/grep-utils");
  const { serverReadFile } = await import("@/app/_server/actions/file");

  if (!ownerUsername) {
    const current = await getCurrentUser();
    if (!current) return undefined;
    ownerUsername = current.username;
  }

  let isShared = false;
  if (actingUsername && actingUsername !== ownerUsername) {
    const { getAllSharedItemsForUser } = await import(
      "@/app/_server/actions/sharing"
    );
    const sharedData = await getAllSharedItemsForUser(actingUsername);
    const match = sharedData.notes.find(
      (s) => s.uuid === uuid && s.sharer === ownerUsername,
    );
    if (!match) return undefined;
    isShared = true;
  }

  const userDir = NOTES_DIR(ownerUsername);
  const absUserDir = path.isAbsolute(userDir)
    ? userDir
    : path.join(process.cwd(), userDir);

  let filePath: string | null = null;
  const found = await grepFindFileByUuid(absUserDir, uuid);
  if (found) {
    filePath = found.filePath;
  } else if (unarchive) {
    const archived = await grepFindFileByUuid(
      path.join(absUserDir, ".archive"),
      uuid,
    );
    if (archived) filePath = archived.filePath;
  }

  if (!filePath) return undefined;

  const noteCategory =
    path
      .relative(absUserDir, path.dirname(filePath))
      .split(path.sep)
      .join("/") || "Uncategorized";
  const slug = path.basename(filePath, ".md");

  const rawContent = await serverReadFile(filePath);
  if (!rawContent) return undefined;

  const stats = await fs.stat(filePath);
  const parsedData = parseNoteContent(rawContent, slug);

  let finalUuid = parsedData.uuid;
  if (!finalUuid) {
    finalUuid = generateUuid();
    try {
      const updatedContent = updateYamlMetadata(rawContent, {
        uuid: finalUuid,
        title: parsedData.title || slug.replace(/-/g, " "),
      });
      await fs.writeFile(filePath, updatedContent, "utf-8");
    } catch (error) {
      console.warn("Failed to save UUID to note file:", error);
    }
  }

  return {
    slug,
    uuid: finalUuid,
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

    const ownCacheKey = canCache ? metaCacheKey("notes", resolvedDir) : null;

    const notes: Note[] = ownCacheKey
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

    if (layoutTiming && isDebugFlag("crud")) {
      console.warn(
        `[layout notes] readNotesRecursively: ${(performance.now() - t1).toFixed(0)}ms`,
      );
    }

    const t2 = layoutTiming ? performance.now() : 0;
    const { getAllSharedItemsForUser } =
      await import("@/app/_server/actions/sharing");
    const sharedData = await getAllSharedItemsForUser(currentUser.username);
    if (layoutTiming && isDebugFlag("crud")) {
      console.warn(
        `[layout notes] sharedItems: ${(performance.now() - t2).toFixed(0)}ms`,
      );
    }

    for (const sharedItem of sharedData.notes) {
      try {
        if (!sharedItem.uuid) continue;

        const sharerDir = NOTES_DIR(sharedItem.sharer);
        await ensureDir(sharerDir);

        const sharerAbsDir = path.isAbsolute(sharerDir)
          ? sharerDir
          : path.join(process.cwd(), sharerDir);
        const sharerCacheKey = canCache
          ? metaCacheKey("notes", sharerAbsDir)
          : null;

        const sharerNotes = sharerCacheKey
          ? await getOrCompute(sharerCacheKey, sharerAbsDir, () =>
              readNotesRecursively(
                sharerDir,
                "",
                sharedItem.sharer,
                allowArchived,
                isRaw,
                metadataOnly,
                excerptLength,
              ),
            )
          : await readNotesRecursively(
              sharerDir,
              "",
              sharedItem.sharer,
              allowArchived,
              isRaw,
              metadataOnly,
              excerptLength,
            );

        const sharedNote = sharerNotes.find(
          (note) => note.uuid === sharedItem.uuid,
        );

        if (sharedNote) {
          notes.push({
            ...sharedNote,
            isShared: true,
          });
        }
      } catch (error) {
        console.error(
          `Error reading shared note ${sharedItem.uuid}:`,
          error,
        );
        continue;
      }
    }

    let filteredNotes = notes;
    if (filter) {
      if (filter.type === "category") {
        filteredNotes = notes.filter((note: any) => {
          const noteCategory = note.category || "Uncategorized";
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
      const _pathMatches = (note: Note, p: string) => {
        const c = note.category || "Uncategorized";
        return `${c}/${note.uuid}` === p || `${c}/${note.slug}` === p;
      };
      const pinned: typeof filteredNotes = [];
      for (const p of pinnedPaths) {
        const found = filteredNotes.find((n) => _pathMatches(n, p));
        if (found) pinned.push(found);
      }
      const rest = filteredNotes.filter(
        (n) => !pinnedPaths.some((p) => _pathMatches(n, p)),
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
