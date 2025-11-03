"use server";

import path from "path";
import { Note, User } from "@/app/_types";
import {
  generateUniqueFilename,
  sanitizeFilename,
} from "@/app/_utils/filename-utils";
import {
  getCurrentUser,
  getUserByNote,
  getUsername,
} from "@/app/_server/actions/users";
import { isAdmin, isAuthenticated } from "@/app/_server/actions/users";
import fs from "fs/promises";
import {
  ensureDir,
  getUserModeDir,
  readOrderFile,
  serverDeleteFile,
  serverReadDir,
  serverWriteFile,
} from "@/app/_server/actions/file";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { DEPRECATED_DOCS_FOLDER, NOTES_FOLDER } from "@/app/_consts/notes";
import { readJsonFile } from "../file";
import {
  ARCHIVED_DIR_NAME,
  EXCLUDED_DIRS,
  USERS_FILE,
} from "@/app/_consts/files";
import { Modes, PermissionTypes } from "@/app/_types/enums";
import { serverReadFile } from "@/app/_server/actions/file";
import { sanitizeMarkdown } from "@/app/_utils/markdown-utils";
import {
  buildCategoryPath,
  decodeCategoryPath,
  encodeCategoryPath,
} from "@/app/_utils/global-utils";
import {
  updateIndexForItem,
  parseInternalLinks,
  removeItemFromIndex,
  updateItemCategory,
} from "@/app/_server/actions/link";
import { parseNoteContent } from "@/app/_utils/client-parser-utils";
import { checkUserPermission } from "@/app/_server/actions/sharing";

const USER_NOTES_DIR = (username: string) =>
  path.join(process.cwd(), "data", NOTES_FOLDER, username);

const formatFileName = (fileName: string): string => {
  return (
    fileName
      ?.replace(/^[.-]+|[.-]+$/g, "")
      ?.replace(/\.+/g, ".")
      ?.charAt(0)
      .toUpperCase() + fileName.slice(1).toLowerCase()
  );
};

const _parseMarkdownNote = (
  content: string,
  id: string,
  category: string,
  owner?: string,
  isShared?: boolean,
  fileStats?: { birthtime: Date; mtime: Date },
  fileName?: string
): Note => {
  const lines = content.split("\n");
  const titleLine = lines.find((line) => line.startsWith("# "));
  const titleFallback = fileName
    ? formatFileName(path.basename(fileName, ".md"))
    : "Untitled Note";
  const title = titleLine?.replace(/^#\s*/, "") || titleFallback;

  const contentWithoutTitle = lines
    .filter((line) => !line.startsWith("# ") || line !== titleLine)
    .join("\n")
    .trim();

  return {
    id,
    title,
    content: contentWithoutTitle,
    category,
    createdAt: fileStats
      ? fileStats.birthtime.toISOString()
      : new Date().toISOString(),
    updatedAt: fileStats
      ? fileStats.mtime.toISOString()
      : new Date().toISOString(),
    owner,
    isShared,
  };
};

const _noteToMarkdown = (doc: Note): string => {
  const header = `# ${doc.title}`;
  const content = doc.content || "";

  return `${header}\n\n${content}`;
};

const _readNotesRecursively = async (
  dir: string,
  basePath: string = "",
  owner: string,
  allowArchived: boolean = false
): Promise<Note[]> => {
  const docs: Note[] = [];
  const entries = await serverReadDir(dir);
  let excludedDirs = EXCLUDED_DIRS;

  if (!allowArchived) {
    excludedDirs = [...EXCLUDED_DIRS, ARCHIVED_DIR_NAME];
  }

  const order = await readOrderFile(dir);
  const dirNames = entries
    .filter((e) => e.isDirectory() && !excludedDirs.includes(e.name))
    .map((e) => e.name);
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
          docs.push(
            _parseMarkdownNote(
              content,
              id,
              categoryPath,
              owner,
              false,
              stats,
              fileName
            )
          );
        } catch {}
      }
    } catch {}

    const subDocs = await _readNotesRecursively(
      categoryDir,
      categoryPath,
      owner,
      allowArchived
    );
    docs.push(...subDocs);
  }

  return docs;
};

const _checkForDocsFolder = async (): Promise<boolean> => {
  try {
    const docsPath = path.join(process.cwd(), "data", DEPRECATED_DOCS_FOLDER);
    await fs.access(docsPath);
    return true;
  } catch {
    return false;
  }
};

export const getNoteById = async (
  id: string,
  category?: string,
  username?: string
): Promise<Note | undefined> => {
  if (!username) {
    const user = await getUserByNote(id, category || "Uncategorized");
    if (user.success && user.data) {
      username = user.data.username;
    } else {
      return undefined;
    }
  }

  const notes = await getRawNotes(username, true);

  if (!notes.success || !notes.data) {
    return undefined;
  }

  const note = notes.data.find(
    (d) =>
      d.id === id &&
      (!category ||
        encodeCategoryPath(d.category || "Uncategorized")?.toLowerCase() ===
          encodeCategoryPath(category || "Uncategorized")?.toLowerCase())
  );

  if (note && "rawContent" in note) {
    const parsedData = parseNoteContent((note as any).rawContent, note.id);
    const result = {
      ...note,
      title: parsedData.title,
      content: parsedData.content,
    };
    return result as Note;
  }

  return note;
};

export const getNotes = async (username?: string, allowArchived?: boolean) => {
  try {
    let userDir: string;
    let currentUser: any = null;

    if (username) {
      userDir = USER_NOTES_DIR(username);
      currentUser = { username };
    } else {
      currentUser = await getCurrentUser();
      if (!currentUser) {
        return { success: false, error: "Not authenticated" };
      }
      userDir = await getUserModeDir(Modes.NOTES);
    }
    await ensureDir(userDir);

    const docs = await _readNotesRecursively(
      userDir,
      "",
      currentUser.username,
      allowArchived
    );

    const { getAllSharedItemsForUser } = await import(
      "@/app/_server/actions/sharing"
    );
    const sharedData = await getAllSharedItemsForUser(currentUser.username);

    for (const sharedItem of sharedData.notes) {
      const fileName = `${sharedItem.id}.md`;

      // Decode the category path since it's URL-encoded in the sharing data
      const decodedCategory = decodeURIComponent(
        sharedItem.category || "Uncategorized"
      );

      const sharedFilePath = path.join(
        process.cwd(),
        "data",
        NOTES_FOLDER,
        sharedItem.sharer,
        decodedCategory,
        `${sharedItem.id}.md`
      );

      try {
        const content = await fs.readFile(sharedFilePath, "utf-8");
        const stats = await fs.stat(sharedFilePath);
        docs.push(
          _parseMarkdownNote(
            content,
            sharedItem.id,
            decodedCategory,
            sharedItem.sharer,
            true,
            stats,
            fileName
          )
        );
      } catch (error) {
        console.error(`Error reading shared document ${sharedItem.id}:`, error);
        console.error(`File path attempted:`, sharedFilePath);
        continue;
      }
    }

    return { success: true, data: docs };
  } catch (error) {
    console.error("Error in getNotes:", error);
    return { success: false, error: "Failed to fetch notes" };
  }
};

export const getRawNotes = async (
  username?: string,
  allowArchived?: boolean
) => {
  try {
    let userDir: string;
    let currentUser: any = null;

    if (username) {
      userDir = USER_NOTES_DIR(username);
      currentUser = { username };
    } else {
      currentUser = await getCurrentUser();
      if (!currentUser) {
        return { success: false, error: "Not authenticated" };
      }
      userDir = await getUserModeDir(Modes.NOTES);
    }
    await ensureDir(userDir);

    const docs: Note[] = [];

    // Recursive function to read notes from directories
    const readNotesFromDir = async (
      dirPath: string,
      categoryPrefix: string
    ) => {
      const entries = await serverReadDir(dirPath);
      let excludedDirs = EXCLUDED_DIRS;

      if (!allowArchived) {
        excludedDirs = [...EXCLUDED_DIRS, ARCHIVED_DIR_NAME];
      }

      const order = await readOrderFile(dirPath);
      const dirNames = entries
        .filter((e) => e.isDirectory() && !excludedDirs.includes(e.name))
        .map((e) => e.name);
      const orderedDirNames: string[] = order?.categories
        ? [
            ...order.categories.filter((n) => dirNames.includes(n)),
            ...dirNames
              .filter((n) => !order.categories!.includes(n))
              .sort((a, b) => a.localeCompare(b)),
          ]
        : dirNames.sort((a, b) => a.localeCompare(b));

      // Read files in current directory
      const files = entries.filter((e) => e.isFile() && e.name.endsWith(".md"));
      const ids = files.map((f) => path.basename(f.name, ".md"));
      const categoryOrder = await readOrderFile(dirPath);
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
        const filePath = path.join(dirPath, fileName);
        try {
          const content = await serverReadFile(filePath);
          const stats = await fs.stat(filePath);
          const rawNote: Note & { rawContent: string } = {
            id,
            title: id,
            content: "",
            category: categoryPrefix,
            createdAt: stats.birthtime.toISOString(),
            updatedAt: stats.mtime.toISOString(),
            owner: currentUser.username,
            isShared: false,
            rawContent: content,
          };
          docs.push(rawNote as Note);
        } catch {}
      }

      // Recursively read subdirectories
      for (const dirName of orderedDirNames) {
        const subDirPath = path.join(dirPath, dirName);
        const subCategoryPrefix = categoryPrefix
          ? `${categoryPrefix}/${dirName}`
          : dirName;
        await readNotesFromDir(subDirPath, subCategoryPrefix);
      }
    };

    await readNotesFromDir(userDir, "");

    const { getAllSharedItemsForUser } = await import(
      "@/app/_server/actions/sharing"
    );
    const sharedData = await getAllSharedItemsForUser(currentUser.username);

    for (const sharedItem of sharedData.notes) {
      const decodedCategory = decodeCategoryPath(
        sharedItem.category || "Uncategorized"
      );

      const sharedFilePath = path.join(
        process.cwd(),
        "data",
        NOTES_FOLDER,
        sharedItem.sharer,
        decodedCategory,
        `${sharedItem.id}.md`
      );

      try {
        const content = await fs.readFile(sharedFilePath, "utf-8");
        const stats = await fs.stat(sharedFilePath);
        const rawNote: Note & { rawContent: string } = {
          id: sharedItem.id,
          title: sharedItem.id,
          content: "",
          category: decodedCategory,
          createdAt: stats.birthtime.toISOString(),
          updatedAt: stats.mtime.toISOString(),
          owner: sharedItem.sharer,
          isShared: true,
          rawContent: content,
        };
        docs.push(rawNote as Note);
      } catch (error) {
        console.error(`Error reading shared document ${sharedItem.id}:`, error);
        console.error(`File path attempted:`, sharedFilePath);
        continue;
      }
    }

    return { success: true, data: docs };
  } catch (error) {
    console.error("Error in getRawNotes:", error);
    return { success: false, error: "Failed to fetch raw notes" };
  }
};

export const getProjectedNotes = async (projection: string[]) => {
  try {
    const notesResult = await getRawNotes();

    if (!notesResult.success || !notesResult.data) {
      return { success: false, error: "Failed to fetch notes" };
    }

    const projectedNotes = notesResult.data.map((note: Note) => {
      const projectedNote: Partial<Note> = {};
      for (const key of projection) {
        if (Object.prototype.hasOwnProperty.call(note, key)) {
          (projectedNote as any)[key] = (note as any)[key];
        }
      }
      return projectedNote;
    });

    return {
      success: true,
      data: projectedNotes,
    };
  } catch (error) {
    console.error("Error in getNotesProjected:", error);
    return { success: false, error: "Failed to fetch notes" };
  }
};

export const createNote = async (formData: FormData) => {
  try {
    const title = formData.get("title") as string;
    const category = (formData.get("category") as string) || "Uncategorized";
    const rawContent = (formData.get("content") as string) || "";
    const formUser = formData.get("user")
      ? JSON.parse(formData.get("user") as string)
      : null;

    const content = sanitizeMarkdown(rawContent);

    const currentUser = formUser || (await getCurrentUser());

    if (!currentUser?.username) {
      return { error: "Not authenticated" };
    }

    const userDir = await getUserModeDir(Modes.NOTES, currentUser.username);
    const categoryDir = path.join(userDir, category);
    await ensureDir(categoryDir);

    const filename = await generateUniqueFilename(categoryDir, title);
    const id = path.basename(filename, ".md");
    const filePath = path.join(categoryDir, filename);

    const newDoc: Note = {
      id,
      title,
      content,
      category,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      owner: currentUser.username,
    };

    await serverWriteFile(filePath, _noteToMarkdown(newDoc));

    try {
      const links = parseInternalLinks(newDoc.content);
      const itemKey = `${newDoc.category || "Uncategorized"}/${newDoc.id}`;
      await updateIndexForItem(currentUser.username, "note", itemKey, links);
    } catch (error) {
      console.warn(
        "Failed to update link index for new note:",
        newDoc.id,
        error
      );
    }

    return { success: true, data: newDoc };
  } catch (error) {
    console.error("Error creating document:", error);
    return { error: "Failed to create document" };
  }
};

export const updateNote = async (formData: FormData, autosaveNotes = false) => {
  try {
    const id = formData.get("id") as string;
    const title = formData.get("title") as string;
    const rawContent = formData.get("content") as string;
    const category = formData.get("category") as string;
    const originalCategory = formData.get("originalCategory") as string;
    const unarchive = formData.get("unarchive") as string;
    let currentUser = formData.get("user") as string | undefined;

    if (!currentUser) {
      currentUser = await getUsername();
    }

    const content = sanitizeMarkdown(rawContent);

    const doc = await getNoteById(id, originalCategory, currentUser);

    const canEdit = await checkUserPermission(
      id,
      originalCategory,
      "note",
      currentUser,
      PermissionTypes.EDIT
    );

    if (!doc) {
      throw new Error("Note not found");
    }

    if (!canEdit) {
      return { error: "Permission denied" };
    }

    const updatedDoc = {
      ...doc,
      title,
      content,
      category: category || doc.category,
      updatedAt: new Date().toISOString(),
    };

    const ownerDir = USER_NOTES_DIR(doc.owner!);
    const categoryDir = path.join(
      ownerDir,
      updatedDoc.category || "Uncategorized"
    );
    await ensureDir(categoryDir);

    let newFilename: string;
    let newId = id;

    const sanitizedTitle = sanitizeFilename(title);
    const currentFilename = `${id}.md`;
    const expectedFilename = `${sanitizedTitle || id}.md`;

    if (title !== doc.title || currentFilename !== expectedFilename) {
      newFilename = await generateUniqueFilename(categoryDir, title);
      newId = path.basename(newFilename, ".md");
    } else {
      newFilename = `${id}.md`;
    }

    if (newId !== id) {
      updatedDoc.id = newId;
    }

    const filePath = path.join(categoryDir, newFilename);

    let oldFilePath: string | null = null;
    if (category && category !== doc.category) {
      oldFilePath = path.join(
        ownerDir,
        doc.category || "Uncategorized",
        `${id}.md`
      );
    } else if (newId !== id) {
      oldFilePath = path.join(
        ownerDir,
        doc.category || "Uncategorized",
        `${id}.md`
      );
    }

    await serverWriteFile(filePath, _noteToMarkdown(updatedDoc));

    try {
      const links = parseInternalLinks(updatedDoc.content);
      const newItemKey = `${updatedDoc.category || "Uncategorized"}/${
        updatedDoc.id
      }`;

      const oldItemKey = `${doc.category || "Uncategorized"}/${id}`;
      if (oldItemKey !== newItemKey) {
        await updateItemCategory(doc.owner!, "note", oldItemKey, newItemKey);
      }

      await updateIndexForItem(doc.owner!, "note", newItemKey, links);
    } catch (error) {
      console.warn(
        "Failed to update link index for note:",
        updatedDoc.id,
        error
      );
    }

    if (newId !== id || (category && category !== doc.category)) {
      const { updateSharingData } = await import(
        "@/app/_server/actions/sharing"
      );

      await updateSharingData(
        {
          id,
          category: doc.category || "Uncategorized",
          itemType: "note",
          sharer: doc.owner!,
        },
        {
          id: newId,
          category: updatedDoc.category || "Uncategorized",
          itemType: "note",
          sharer: doc.owner!,
        }
      );
    }

    if (oldFilePath && oldFilePath !== filePath) {
      await serverDeleteFile(oldFilePath);
    }

    try {
      if (!autosaveNotes) {
        revalidatePath("/");
        const oldCategoryPath = buildCategoryPath(
          doc.category || "Uncategorized",
          id
        );
        const newCategoryPath = buildCategoryPath(
          updatedDoc.category || "Uncategorized",
          newId !== id ? newId : id
        );

        revalidatePath(`/note/${oldCategoryPath}`);

        if (newId !== id || doc.category !== updatedDoc.category) {
          revalidatePath(`/note/${newCategoryPath}`);
        }
      }
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error
      );
    }

    return { success: true, data: updatedDoc };
  } catch (error) {
    return { error: "Failed to update document" };
  }
};

export const deleteNote = async (formData: FormData) => {
  try {
    const id = formData.get("id") as string;
    const category = formData.get("category") as string;

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { error: "Not authenticated" };
    }

    const isAdminUser = await isAdmin();
    const docs = await (isAdminUser ? getAllNotes() : getNotes());
    if (!docs.success || !docs.data) {
      return { error: "Failed to fetch documents" };
    }

    const doc = docs.data.find((d) => d.id === id && d.category === category);
    if (!doc) {
      return { error: "Document not found" };
    }

    let filePath: string;

    if (doc.isShared) {
      if (!currentUser.isAdmin && currentUser.username !== doc.owner) {
        return { error: "Unauthorized to delete this shared document" };
      }

      const ownerDir = USER_NOTES_DIR(doc.owner!);
      filePath = path.join(ownerDir, category || "Uncategorized", `${id}.md`);
    } else {
      const userDir = await getUserModeDir(Modes.NOTES);
      filePath = path.join(userDir, category || "Uncategorized", `${id}.md`);
    }

    await serverDeleteFile(filePath);

    try {
      const itemKey = `${doc.category || "Uncategorized"}/${id}`;
      await removeItemFromIndex(doc.owner!, "note", itemKey);
    } catch (error) {
      console.warn("Failed to remove note from link index:", id, error);
    }

    if (doc.owner) {
      const { updateSharingData } = await import(
        "@/app/_server/actions/sharing"
      );
      await updateSharingData(
        {
          id,
          category: doc.category || "Uncategorized",
          itemType: "note",
          sharer: doc.owner,
        },
        null
      );
    }

    try {
      revalidatePath("/");
      const categoryPath = buildCategoryPath(
        doc.category || "Uncategorized",
        id
      );
      revalidatePath(`/note/${categoryPath}`);
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error
      );
    }

    return { success: true };
  } catch (error) {
    return { error: "Failed to delete document" };
  }
};

export const getAllNotes = async (allowArchived?: boolean) => {
  try {
    const allDocs: Note[] = [];

    const users: User[] = await readJsonFile(USERS_FILE);

    for (const user of users) {
      const userDir = USER_NOTES_DIR(user.username);

      try {
        const userDocs = await _readNotesRecursively(
          userDir,
          "",
          user.username,
          allowArchived
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

export const CheckForNeedsMigration = async (): Promise<boolean> => {
  const needsMigration = await _checkForDocsFolder();
  const isLoggedIn = await isAuthenticated();
  if (needsMigration && isLoggedIn) {
    redirect("/migration");
  }

  return false;
};
