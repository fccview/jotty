"use server";

import path from "path";
import fs from "fs/promises";
import { Note, User, GetNotesOptions } from "@/app/_types";
import { NOTES_DIR } from "@/app/_consts/files";
import { Modes } from "@/app/_types/enums";
import { getCurrentUser, getUserByNote } from "@/app/_server/actions/users";
import { getUserModeDir, ensureDir } from "@/app/_server/actions/file";
import { readJsonFile } from "@/app/_server/actions/file";
import { USERS_FILE } from "@/app/_consts/files";
import { parseNoteContent } from "@/app/_utils/client-parser-utils";
import {
  generateUuid,
  updateYamlMetadata,
} from "@/app/_utils/yaml-metadata-utils";
import { readNotesRecursively } from "./readers";

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
  id: string,
  category?: string,
  username?: string,
): Promise<Note | undefined> => {
  const { grepFindFileByUuid } = await import("@/app/_utils/grep-utils");
  const { serverReadFile } = await import("@/app/_server/actions/file");

  if (!username) {
    const { getUserByNoteUuid } = await import("@/app/_server/actions/users");
    const userByUuid = await getUserByNoteUuid(id);

    if (userByUuid.success && userByUuid.data) {
      username = userByUuid.data.username;
    } else {
      const user = await getUserByNote(id, category || "Uncategorized");

      if (user.success && user.data) {
        username = user.data.username;
      } else {
        return undefined;
      }
    }
  }

  let ownerUsername = username;
  const userDir = NOTES_DIR(username);
  const absUserDir = path.join(process.cwd(), userDir);
  let filePath: string | null = null;
  let noteId = id;
  let noteCategory = category || "Uncategorized";
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  if (isUuid) {
    const found = await grepFindFileByUuid(absUserDir, id);
    if (found) {
      filePath = found.filePath;
      noteId = found.id;
      noteCategory = found.category;
    }
  }

  if (!filePath && category) {
    const directPath = path.join(absUserDir, category, `${id}.md`);
    try {
      await fs.access(directPath);
      filePath = directPath;
    } catch {
      const archivedPath = path.join(
        absUserDir,
        ".archive",
        category,
        `${id}.md`,
      );
      try {
        await fs.access(archivedPath);
        filePath = archivedPath;
        noteCategory = `.archive/${category}`;
      } catch {}
    }
  }

  let isShared = false;

  if (!filePath) {
    const { getAllSharedItemsForUser } =
      await import("@/app/_server/actions/sharing");
    const sharedData = await getAllSharedItemsForUser(username);
    for (const sharedItem of sharedData.notes) {
      const itemIdentifier = sharedItem.uuid || sharedItem.id;
      if (!itemIdentifier) continue;

      const sharerDir = path.join(process.cwd(), NOTES_DIR(sharedItem.sharer));
      const found = isUuid && (await grepFindFileByUuid(sharerDir, id));

      if (found) {
        filePath = found.filePath;
        noteId = found.id;
        noteCategory = found.category;
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
  const parsedData = parseNoteContent(rawContent, noteId);

  let finalUuid = parsedData.uuid;
  if (!finalUuid) {
    finalUuid = generateUuid();
    try {
      const updatedContent = updateYamlMetadata(rawContent, {
        uuid: finalUuid,
        title: parsedData.title || noteId.replace(/-/g, " "),
      });
      await fs.writeFile(filePath, updatedContent, "utf-8");
    } catch (error) {
      console.warn("Failed to save UUID to note file:", error);
    }
  }

  return {
    id: noteId,
    uuid: finalUuid,
    title: parsedData.title,
    content: parsedData.content,
    category: noteCategory,
    createdAt: stats.birthtime.toISOString(),
    updatedAt: stats.mtime.toISOString(),
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

    const notes: any[] = await readNotesRecursively(
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
    if (layoutTiming) {
      console.warn(
        `[layout notes] readNotesRecursively: ${(performance.now() - t1).toFixed(0)}ms`,
      );
    }

    const t2 = layoutTiming ? performance.now() : 0;
    const { getAllSharedItemsForUser } =
      await import("@/app/_server/actions/sharing");
    const sharedData = await getAllSharedItemsForUser(currentUser.username);
    if (layoutTiming) {
      console.warn(
        `[layout notes] sharedItems: ${(performance.now() - t2).toFixed(0)}ms`,
      );
    }

    for (const sharedItem of sharedData.notes) {
      try {
        const itemIdentifier = sharedItem.uuid || sharedItem.id;
        if (!itemIdentifier) continue;

        const sharerDir = NOTES_DIR(sharedItem.sharer);
        await ensureDir(sharerDir);
        const sharerNotes = await readNotesRecursively(
          sharerDir,
          "",
          sharedItem.sharer,
          allowArchived,
          isRaw,
          metadataOnly,
          excerptLength,
        );
        const sharedNote = sharerNotes.find(
          (note) => note.uuid === itemIdentifier || note.id === itemIdentifier,
        );

        if (sharedNote) {
          notes.push({
            ...sharedNote,
            isShared: true,
          });
        }
      } catch (error) {
        console.error(
          `Error reading shared note ${sharedItem.uuid || sharedItem.id}:`,
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
    if (!filter && pinnedPaths && pinnedPaths.length > 0 && limit && limit > 0) {
      const pathMatches = (note: { category?: string; uuid?: string; id: string }, p: string) => {
        const c = note.category || "Uncategorized";
        const u = note.uuid || note.id;
        return `${c}/${u}` === p || `${c}/${note.id}` === p;
      };
      const pinned: typeof filteredNotes = [];
      for (const p of pinnedPaths) {
        const found = filteredNotes.find((n: { category?: string; uuid?: string; id: string }) => pathMatches(n, p));
        if (found) pinned.push(found);
      }
      const rest = filteredNotes.filter((n: { category?: string; uuid?: string; id: string }) => !pinnedPaths.some((p) => pathMatches(n, p)));
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
