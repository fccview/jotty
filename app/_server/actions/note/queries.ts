"use server";

import path from "path";
import fs from "fs/promises";
import { Note, User, Result, GetNotesOptions } from "@/app/_types";
import { NOTES_DIR } from "@/app/_consts/files";
import { NOTES_FOLDER } from "@/app/_consts/notes";
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

  const notes = await getUserNotes({
    username,
    allowArchived: true,
    isRaw: true,
  });

  if (!notes.success || !notes.data) {
    return undefined;
  }

  const { encodeCategoryPath } = await import("@/app/_utils/global-utils");

  const note = notes.data.find(
    (d) =>
      (d.id === id || d.uuid === id) &&
      (!category ||
        encodeCategoryPath(d.category || "Uncategorized")?.toLowerCase() ===
          encodeCategoryPath(category || "Uncategorized")?.toLowerCase()),
  );

  if (note && "rawContent" in note) {
    const parsedData = parseNoteContent(
      (note as any).rawContent || "",
      note.id || "",
    );
    const existingUuid = parsedData.uuid || note.uuid;

    let finalUuid = existingUuid;
    if (!finalUuid && username) {
      finalUuid = generateUuid();

      try {
        const updatedContent = updateYamlMetadata((note as any).rawContent, {
          uuid: finalUuid,
          title: parsedData.title || note.id?.replace(/-/g, " "),
        });

        const dataDir = path.join(process.cwd(), "data");
        const userDir = path.join(dataDir, NOTES_FOLDER, username);
        const decodedCategory = decodeURIComponent(
          note.category || "Uncategorized",
        );
        const categoryDir = path.join(userDir, decodedCategory);
        const filePath = path.join(categoryDir, `${note.id}.md`);

        await fs.writeFile(filePath, updatedContent, "utf-8");
      } catch (error) {
        console.warn("Failed to save UUID to note file:", error);
      }
    }

    const result = {
      ...note,
      title: parsedData.title,
      content: parsedData.content,
      uuid: finalUuid,
      encrypted: parsedData.encrypted || false,
      encryptionMethod: parsedData.encryptionMethod,
      tags: parsedData.tags || [],
    };
    return result as Note;
  }

  return note as Note;
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

    const notes: any[] = await readNotesRecursively(
      userDir,
      "",
      currentUser.username,
      allowArchived,
      isRaw,
      metadataOnly,
      excerptLength,
    );

    const { getAllSharedItemsForUser } =
      await import("@/app/_server/actions/sharing");
    const sharedData = await getAllSharedItemsForUser(currentUser.username);

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

    if (limit && limit > 0) {
      filteredNotes = filteredNotes.slice(0, limit);
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
) => {
  return getUserNotes({
    filter: filter || undefined,
    limit: filter ? undefined : limit,
  });
};
