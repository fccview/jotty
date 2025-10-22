"use server";

import path from "path";
import { Note, User } from "@/app/_types";
import {
  generateUniqueFilename,
  sanitizeFilename,
} from "@/app/_utils/filename-utils";
import { getCurrentUser } from "@/app/_server/actions/users";
import {
  getItemsSharedWithUser,
  removeSharedItem,
  updateSharedItem,
} from "@/app/_server/actions/sharing";
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
import { USERS_FILE } from "@/app/_consts/files";
import { Modes } from "@/app/_types/enums";
import { serverReadFile } from "@/app/_server/actions/file";
import { sanitizeMarkdown } from "@/app/_utils/markdown-utils";
import { buildCategoryPath } from "@/app/_utils/global-utils";

const USER_NOTES_DIR = (username: string) =>
  path.join(process.cwd(), "data", NOTES_FOLDER, username);

const _parseMarkdownNote = (
  content: string,
  id: string,
  category: string,
  owner?: string,
  isShared?: boolean,
  fileStats?: { birthtime: Date; mtime: Date }
): Note => {
  const lines = content.split("\n");
  const titleLine = lines.find((line) => line.startsWith("# "));
  const title = titleLine?.replace(/^#\s*/, "") || "Untitled Note";

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
  owner: string
): Promise<Note[]> => {
  const docs: Note[] = [];
  const entries = await serverReadDir(dir);
  const excludedDirs = ["images", "files"];

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
            _parseMarkdownNote(content, id, categoryPath, owner, false, stats)
          );
        } catch {}
      }
    } catch {}

    const subDocs = await _readNotesRecursively(
      categoryDir,
      categoryPath,
      owner
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
  category?: string
): Promise<Note | undefined> => {
  const docs = await getNotes();
  if (!docs.success || !docs.data) {
    return undefined;
  }
  return docs.data.find(
    (d) => d.id === id && (!category || d.category === category)
  );
};

export const getNotes = async (username?: string) => {
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

    const docs = await _readNotesRecursively(userDir, "", currentUser.username);

    const sharedItems = await getItemsSharedWithUser(currentUser.username);
    for (const sharedItem of sharedItems.notes) {
      const sharedFilePath = sharedItem.filePath
        ? path.join(process.cwd(), "data", NOTES_FOLDER, sharedItem.filePath)
        : path.join(
            process.cwd(),
            "data",
            NOTES_FOLDER,
            sharedItem.owner,
            sharedItem.category || "Uncategorized",
            `${sharedItem.id}.md`
          );

      try {
        const content = await fs.readFile(sharedFilePath, "utf-8");
        const stats = await fs.stat(sharedFilePath);
        docs.push(
          _parseMarkdownNote(
            content,
            sharedItem.id,
            sharedItem.category || "Uncategorized",
            sharedItem.owner,
            true,
            stats
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

export const createNote = async (formData: FormData) => {
  try {
    const title = formData.get("title") as string;
    const category = (formData.get("category") as string) || "Uncategorized";
    const rawContent = (formData.get("content") as string) || "";

    const content = sanitizeMarkdown(rawContent);

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { error: "Not authenticated" };
    }

    const userDir = await getUserModeDir(Modes.NOTES);
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

    const content = sanitizeMarkdown(rawContent);

    const isAdminUser = await isAdmin();
    const docs = await (isAdminUser ? getAllNotes() : getNotes());
    if (!docs.success || !docs.data) {
      throw new Error(docs.error || "Failed to fetch notes");
    }

    const doc = docs.data.find((d) => d.id === id && d.category === category);
    if (!doc) {
      throw new Error("Note not found");
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

    const { getItemSharingMetadata } = await import(
      "@/app/_server/actions/sharing"
    );
    const sharingMetadata = await getItemSharingMetadata(
      id,
      "note",
      doc.owner!
    );

    if (sharingMetadata) {
      const newFilePath = `${doc.owner}/${
        updatedDoc.category || "Uncategorized"
      }/${updatedDoc.id}.md`;

      if (newId !== id) {
        const { removeSharedItem, addSharedItem } = await import(
          "@/app/_server/actions/sharing"
        );

        await removeSharedItem(id, "note", doc.owner!);

        await addSharedItem(
          updatedDoc.id,
          "note",
          updatedDoc.title,
          doc.owner!,
          sharingMetadata.sharedWith,
          updatedDoc.category,
          newFilePath,
          sharingMetadata.isPubliclyShared
        );
      } else {
        await updateSharedItem(updatedDoc.id, "note", doc.owner!, {
          filePath: newFilePath,
          category: updatedDoc.category,
          title: updatedDoc.title,
        });
      }
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

    if (doc.isShared && doc.owner) {
      await removeSharedItem(id, "note", doc.owner);
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

export const getAllNotes = async () => {
  try {
    const allDocs: Note[] = [];

    const users: User[] = await readJsonFile(USERS_FILE);

    for (const user of users) {
      const userDir = USER_NOTES_DIR(user.username);

      try {
        const userDocs = await _readNotesRecursively(
          userDir,
          "",
          user.username
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
