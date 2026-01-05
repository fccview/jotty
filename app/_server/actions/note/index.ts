"use server";

import path from "path";
import { Note, User } from "@/app/_types";
import { generateUniqueFilename } from "@/app/_utils/filename-utils";
import { detectEncryptionMethod, isEncrypted } from "@/app/_utils/encryption-utils";
import {
  getCurrentUser,
  getUserByNote,
  getUsername,
} from "@/app/_server/actions/users";
import { isAuthenticated } from "@/app/_server/actions/users";
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
import { NOTES_FOLDER } from "@/app/_consts/notes";
import { readJsonFile } from "../file";
import {
  ARCHIVED_DIR_NAME,
  EXCLUDED_DIRS,
  USERS_FILE,
} from "@/app/_consts/files";
import { ItemTypes, Modes, PermissionTypes } from "@/app/_types/enums";
import { serverReadFile } from "@/app/_server/actions/file";
import { sanitizeMarkdown } from "@/app/_utils/markdown-utils";
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
  rebuildLinkIndex,
} from "@/app/_server/actions/link";
import { parseNoteContent } from "@/app/_utils/client-parser-utils";
import { checkUserPermission } from "@/app/_server/actions/sharing";
import {
  extractYamlMetadata,
  extractTitle,
  generateYamlFrontmatter,
  generateUuid,
  updateYamlMetadata,
} from "@/app/_utils/yaml-metadata-utils";
import { extractYamlMetadata as stripYaml } from "@/app/_utils/yaml-metadata-utils";
import { getAppSettings } from "../config";
import { logContentEvent } from "@/app/_server/actions/log";

interface GetNotesOptions {
  username?: string;
  allowArchived?: boolean;
  isRaw?: boolean;
  projection?: string[];
}

const USER_NOTES_DIR = (username: string) =>
  path.join(process.cwd(), "data", NOTES_FOLDER, username);

const _parseMarkdownNote = (
  content: string,
  id: string,
  category: string,
  owner?: string,
  isShared?: boolean,
  fileStats?: { birthtime: Date; mtime: Date },
  fileName?: string
): Note => {
  const { metadata, contentWithoutMetadata } = extractYamlMetadata(content);

  const title = extractTitle(
    content,
    fileName ? path.basename(fileName, ".md") : undefined
  );

  return {
    id,
    uuid: metadata.uuid || generateUuid(),
    title,
    content: contentWithoutMetadata,
    category,
    createdAt: fileStats
      ? fileStats.birthtime.toISOString()
      : new Date().toISOString(),
    updatedAt: fileStats
      ? fileStats.mtime.toISOString()
      : new Date().toISOString(),
    owner,
    isShared,
    encrypted: metadata.encrypted || false,
    encryptionMethod: metadata.encryptionMethod,
  };
};

const convertInternalLinksToNewFormat = async (
  content: string,
  username?: string,
  category?: string
): Promise<string> => {
  let convertedContent = content;

  // @ts-ignore
  const spanRegex = /<span[^>]*data-internal-link[^>]*>.*?<\/span>/gs;
  const spanMatches = Array.from(content.matchAll(spanRegex));

  for (const match of spanMatches) {
    const [fullMatch] = match;
    const hrefMatch = fullMatch.match(/data-href="([^"]*)"/);
    const convertMatch = fullMatch.match(
      /data-convert-to-bidirectional="([^"]*)"/
    );

    const href = hrefMatch?.[1];
    const shouldConvert = convertMatch?.[1] === "true";

    if (!shouldConvert || !href) {
      continue;
    }

    if (href.startsWith("/jotty/")) {
      continue;
    }

    if (href.startsWith("/note/")) {
      const parts = href.split("/");
      if (parts.length >= 3) {
        const categoryAndId = parts.slice(2).join("/");
        const lastSlashIndex = categoryAndId.lastIndexOf("/");
        const id = categoryAndId.substring(lastSlashIndex + 1);

        try {
          const notes = await getUserNotes({ username, allowArchived: true });
          if (notes.success && notes.data) {
            const note = notes.data.find((n) => n.id === id);
            if (note?.uuid) {
              let updatedSpan = fullMatch
                .replace(/data-href="[^"]*"/, `data-href="/jotty/${note.uuid}"`)
                .replace(
                  /data-convert-to-bidirectional="true"/,
                  `data-convert-to-bidirectional="false"`
                );

              if (fullMatch.includes("data-uuid=")) {
                updatedSpan = updatedSpan.replace(
                  /data-uuid="[^"]*"/,
                  `data-uuid="${note.uuid}"`
                );
              } else {
                updatedSpan = updatedSpan.replace(
                  "data-internal-link",
                  `data-internal-link data-uuid="${note.uuid}"`
                );
              }
              convertedContent = convertedContent.replace(
                fullMatch,
                updatedSpan
              );
            }
          }
        } catch (error) {
          console.warn("Failed to convert note link:", href, error);
        }
      }
    } else if (href.startsWith("/checklist/")) {
      const parts = href.split("/");
      if (parts.length >= 3) {
        const categoryAndId = parts.slice(2).join("/");
        const lastSlashIndex = categoryAndId.lastIndexOf("/");
        const id = categoryAndId.substring(lastSlashIndex + 1);

        try {
          const { getUserChecklists } = await import("../checklist");
          const checklists = await getUserChecklists({
            username,
            isRaw: true,
            allowArchived: true,
          });
          if (checklists.success && checklists.data) {
            const checklist = checklists.data.find((c) => c.id === id);
            if (checklist?.uuid) {
              let updatedSpan = fullMatch
                .replace(
                  /data-href="[^"]*"/,
                  `data-href="/jotty/${checklist.uuid}"`
                )
                .replace(
                  /data-convert-to-bidirectional="true"/,
                  `data-convert-to-bidirectional="false"`
                );

              if (fullMatch.includes("data-uuid=")) {
                updatedSpan = updatedSpan.replace(
                  /data-uuid="[^"]*"/,
                  `data-uuid="${checklist.uuid}"`
                );
              } else {
                updatedSpan = updatedSpan.replace(
                  "data-internal-link",
                  `data-internal-link data-uuid="${checklist.uuid}"`
                );
              }
              convertedContent = convertedContent.replace(
                fullMatch,
                updatedSpan
              );
            }
          }
        } catch (error) {
          console.warn("Failed to convert checklist link:", href, error);
        }
      }
    }
  }

  return convertedContent;
};

const _noteToMarkdown = (note: Note): string => {
  const metadata: any = {};
  metadata.uuid = note.uuid || generateUuid();

  let content = note.content || "";
  const lines = content.split("\n");

  if (!note.title && lines[0]?.trim().startsWith("# ")) {
    metadata.title = lines[0].trim().replace(/^#\s*/, "") || "Untitled Note";
    content = lines.slice(1).join("\n").trim();
  } else {
    metadata.title = note.title || "Untitled Note";
    content = lines.join("\n").trim();
  }

  if (note.encrypted) {
    metadata.encrypted = true;
    if (note.encryptionMethod) {
      metadata.encryptionMethod = note.encryptionMethod;
    }
  }

  const frontmatter = generateYamlFrontmatter(metadata);

  return `${frontmatter}${content}`.trim();
};

const _readNotesRecursively = async (
  dir: string,
  basePath: string = "",
  owner: string,
  allowArchived: boolean = false,
  isRaw: boolean = false
): Promise<any[]> => {
  const notes: any[] = [];
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

          if (isRaw) {
            const { metadata } = extractYamlMetadata(content);
            let uuid = metadata.uuid;
            if (!uuid) {
              uuid = generateUuid();
              try {
                const updatedContent = updateYamlMetadata(content, { uuid });
                await serverWriteFile(filePath, updatedContent);
              } catch (error) {
                console.warn("Failed to save UUID to note file:", error);
              }
            }
            const rawNote: Note & { rawContent: string } = {
              id,
              uuid,
              title: id,
              content: "",
              category: categoryPath,
              createdAt: stats.birthtime.toISOString(),
              updatedAt: stats.mtime.toISOString(),
              owner,
              isShared: false,
              rawContent: content,
            };
            notes.push(rawNote);
          } else {
            notes.push(
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
          }
        } catch { }
      }
    } catch { }

    const subDocs = await _readNotesRecursively(
      categoryDir,
      categoryPath,
      owner,
      allowArchived,
      isRaw
    );
    notes.push(...subDocs);
  }

  return notes;
};

const _checkDataFilesNeedMigration = async (): Promise<boolean> => {
  try {
    const { readdir } = await import("fs/promises");
    const { join } = await import("path");
    const dataDir = join(process.cwd(), "data");

    const checkDirectory = async (dirPath: string): Promise<boolean> => {
      try {
        const items = await readdir(dirPath, { withFileTypes: true });

        for (const item of items) {
          const fullPath = join(dirPath, item.name);

          if (item.isDirectory()) {
            if (!["temp_exports", "backups"].includes(item.name)) {
              if (await checkDirectory(fullPath)) {
                return true;
              }
            }
          } else if (item.name === ".index.json") {
            const indexContent = await fs.readFile(fullPath, "utf-8");
            const index = JSON.parse(indexContent);

            const allKeys = [
              ...Object.keys(index.notes || {}),
              ...Object.keys(index.checklists || {}),
            ];

            for (const key of allKeys) {
              if (key.includes("/")) {
                return true;
              }
            }
          } else if (item.name === ".sharing.json") {
            const sharingContent = await fs.readFile(fullPath, "utf-8");
            const sharingData = JSON.parse(sharingContent);

            for (const userShares of Object.values(sharingData) as any[]) {
              for (const entry of userShares) {
                if (!entry.uuid) {
                  return true;
                }
              }
            }
          }
        }
      } catch (error) {
        const { logAudit } = await import("@/app/_server/actions/log");
        await logAudit({
          level: "DEBUG",
          action: "migration_check",
          category: "note",
          success: false,
          errorMessage: "Error checking directory for migration",
          metadata: { error: String(error) }
        });
      }

      return false;
    };

    return await checkDirectory(dataDir);
  } catch (error) {
    console.warn("Failed to check data files for migration:", error);
    return false;
  }
};

const _checkForMigrationNeeded = async (): Promise<boolean> => {
  try {
    const { SHARED_ITEMS_FILE } = await import("@/app/_consts/files");
    await fs.access(SHARED_ITEMS_FILE);
    return true;
  } catch (error) {
    const { logAudit } = await import("@/app/_server/actions/log");
    await logAudit({
      level: "DEBUG",
      action: "migration_check",
      category: "sharing",
      success: false,
      errorMessage: "Shared items file doesn't exist - no migration needed",
    });
  }

  try {
    const dataFilesNeedMigration = await _checkDataFilesNeedMigration();
    if (dataFilesNeedMigration) {
      return true;
    }
  } catch (error) {
    console.warn("Failed to check for YAML migration:", error);
  }

  return false;
};

export const createNote = async (formData: FormData) => {
  try {
    const { title, category, rawContent, user } = getFormData(formData, [
      "title",
      "category",
      "rawContent",
      "user",
    ]);
    const formUser = user ? JSON.parse(user as string) : null;

    const sanitizedContent = sanitizeMarkdown(rawContent);
    const { contentWithoutMetadata } = stripYaml(sanitizedContent);
    const content = contentWithoutMetadata;

    const currentUser = formUser || (await getCurrentUser());

    if (!currentUser?.username) {
      return { error: "Not authenticated" };
    }

    const userDir = await getUserModeDir(Modes.NOTES, currentUser.username);
    const categoryDir = path.join(userDir, category);
    await ensureDir(categoryDir);

    const fileRenameMode = currentUser?.fileRenameMode || "minimal";
    const filename = await generateUniqueFilename(categoryDir, title, ".md", fileRenameMode);
    const id = path.basename(filename, ".md");
    const filePath = path.join(categoryDir, filename);

    const newDoc: Note = {
      id,
      uuid: generateUuid(),
      title,
      content,
      category,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      owner: currentUser.username,
    };

    await serverWriteFile(filePath, _noteToMarkdown(newDoc));

    try {
      const links = (await parseInternalLinks(newDoc.content)) || [];
      await updateIndexForItem(
        currentUser.username,
        "note",
        newDoc.uuid!,
        links
      );
    } catch (error) {
      console.warn(
        "Failed to update link index for new note:",
        newDoc.id,
        error
      );
    }

    await logContentEvent("note_created", "note", newDoc.uuid!, newDoc.title, true, { category: newDoc.category });

    return { success: true, data: newDoc };
  } catch (error) {
    const { title } = getFormData(formData, ["title"]);
    console.error("Error creating note:", error);
    await logContentEvent("note_created", "note", "", title || "unknown", false);
    return { error: "Failed to create note" };
  }
};

export const updateNote = async (formData: FormData, autosaveNotes = false) => {
  try {
    const {
      id,
      title,
      content,
      category,
      originalCategory,
      user,
      uuid,
    } = getFormData(formData, [
      "id",
      "title",
      "content",
      "category",
      "originalCategory",
      "user",
      "uuid",
    ]);
    const settings = await getAppSettings();

    let currentUser = user;

    if (!currentUser) {
      currentUser = await getUsername();
    }

    const sanitizedContent = sanitizeMarkdown(content);
    const { contentWithoutMetadata } = stripYaml(sanitizedContent);
    const processedContent = settings?.data?.editor?.enableBilateralLinks
      ? await convertInternalLinksToNewFormat(
        contentWithoutMetadata,
        currentUser,
        originalCategory
      )
      : contentWithoutMetadata;

    const convertedContent = processedContent;

    const note = await getNoteById(uuid || id, originalCategory, currentUser);

    const canEdit = await checkUserPermission(
      id,
      originalCategory,
      "note",
      currentUser,
      PermissionTypes.EDIT
    );

    if (!note) {
      throw new Error("Note not found");
    }

    if (!canEdit) {
      return { error: "Permission denied" };
    }

    const encryptionMethod = detectEncryptionMethod(convertedContent) || undefined;
    const updatedDoc = {
      ...note,
      title,
      content: convertedContent,
      category: category || note.category,
      updatedAt: new Date().toISOString(),
      encrypted: isEncrypted(convertedContent),
      encryptionMethod,
    };

    const ownerDir = USER_NOTES_DIR(note.owner!);
    const categoryDir = path.join(
      ownerDir,
      updatedDoc.category || "Uncategorized"
    );
    await ensureDir(categoryDir);

    let newFilename: string;
    let newId = id;

    if (title !== note.title) {
      const ownerUser = await getCurrentUser();
      const fileRenameMode = ownerUser?.fileRenameMode || "minimal";
      newFilename = await generateUniqueFilename(categoryDir, title, ".md", fileRenameMode);
      newId = path.basename(newFilename, ".md");
    } else {
      newFilename = `${id}.md`;
    }

    if (newId !== id) {
      updatedDoc.id = newId;
    }

    const filePath = path.join(categoryDir, newFilename);

    let oldFilePath: string | null = null;
    if (category && category !== note.category) {
      oldFilePath = path.join(
        ownerDir,
        note.category || "Uncategorized",
        `${id}.md`
      );
    } else if (newId !== id) {
      oldFilePath = path.join(
        ownerDir,
        note.category || "Uncategorized",
        `${id}.md`
      );
    }

    await serverWriteFile(filePath, _noteToMarkdown(updatedDoc));

    if (settings?.data?.editor?.enableBilateralLinks) {
      try {
        const links = (await parseInternalLinks(updatedDoc.content)) || [];
        const newItemKey = `${updatedDoc.category || "Uncategorized"}/${updatedDoc.id
          }`;

        const oldItemKey = `${note.category || "Uncategorized"}/${id}`;

        if (oldItemKey !== newItemKey) {
          await rebuildLinkIndex(note.owner!);
          revalidatePath("/");
        }

        await updateIndexForItem(note.owner!, "note", updatedDoc.uuid!, links);
      } catch (error) {
        console.warn(
          "Failed to update link index for note:",
          updatedDoc.id,
          error
        );
      }
    }

    if (newId !== id || (category && category !== note.category)) {
      const { updateSharingData } = await import(
        "@/app/_server/actions/sharing"
      );

      await updateSharingData(
        {
          id,
          category: note.category || "Uncategorized",
          itemType: "note",
          sharer: note.owner!,
        },
        {
          id: newId,
          category: updatedDoc.category || "Uncategorized",
          itemType: "note",
          sharer: note.owner!,
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
          note.category || "Uncategorized",
          id
        );
        const newCategoryPath = buildCategoryPath(
          updatedDoc.category || "Uncategorized",
          newId !== id ? newId : id
        );

        revalidatePath(`/note/${oldCategoryPath}`);

        if (newId !== id || note.category !== updatedDoc.category) {
          revalidatePath(`/note/${newCategoryPath}`);
        }
      }
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error
      );
    }

    if (!updatedDoc.encrypted) {
      await logContentEvent("note_updated", "note", note.uuid!, updatedDoc.title, true, { category: updatedDoc.category });
    }

    return { success: true, data: updatedDoc };
  } catch (error) {
    const {
      title,
      uuid,
    } = getFormData(formData, [
      "title",
      "uuid",
    ]);
    await logContentEvent("note_updated", "note", uuid!, title || "unknown", false);
    return { error: "Failed to update note" };
  }
};

export const deleteNote = async (formData: FormData, username?: string) => {
  try {
    const { id, category } = getFormData(formData, ["id", "category"]);

    let currentUser: any = null;
    if (username) {
      const { getUserByUsername } = await import("@/app/_server/actions/users");
      const userResult = await getUserByUsername(username);
      if (userResult) {
        currentUser = userResult;
      }
    }

    if (!currentUser) {
      currentUser = await getCurrentUser();
    }

    if (!currentUser) {
      return { error: "Not authenticated" };
    }

    const notes = await getUserNotes(
      username ? { username: currentUser.username } : {}
    );

    if (!notes.success || !notes.data) {
      return { error: "Failed to fetch notes" };
    }

    const note = notes.data.find((d) => d.id === id && d.category === category);
    if (!note) {
      return { error: "Document not found" };
    }

    let filePath: string;

    if (note.isShared) {
      if (!currentUser.isAdmin && currentUser.username !== note.owner) {
        return { error: "Unauthorized to delete this shared note" };
      }

      const ownerDir = USER_NOTES_DIR(note.owner!);
      filePath = path.join(ownerDir, category || "Uncategorized", `${id}.md`);
    } else {
      const userDir = await getUserModeDir(Modes.NOTES, currentUser.username);
      filePath = path.join(userDir, category || "Uncategorized", `${id}.md`);
    }

    await serverDeleteFile(filePath);

    try {
      await removeItemFromIndex(note.owner!, "note", note.uuid!);
    } catch (error) {
      console.warn("Failed to remove note from link index:", id, error);
    }

    if (note.owner) {
      const { updateSharingData } = await import(
        "@/app/_server/actions/sharing"
      );
      await updateSharingData(
        {
          id,
          category: note.category || "Uncategorized",
          itemType: "note",
          sharer: note.owner,
        },
        null
      );
    }

    try {
      revalidatePath("/");
      const categoryPath = buildCategoryPath(
        note.category || "Uncategorized",
        id
      );
      revalidatePath(`/note/${categoryPath}`);
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error
      );
    }

    await logContentEvent("note_deleted", "note", note.uuid!, note.title!, true, { category: note.category });

    return { success: true };
  } catch (error) {
    const {
      uuid,
    } = getFormData(formData, [
      "uuid",
    ]);
    const note = await getNoteById(uuid!, "");
    await logContentEvent("note_deleted", "note", uuid!, note?.title || "unknown", false);
    return { error: "Failed to delete note" };
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
          allowArchived,
          false
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
  username?: string
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

  const note = notes.data.find(
    (d) =>
      (d.id === id || d.uuid === id) &&
      (!category ||
        encodeCategoryPath(d.category || "Uncategorized")?.toLowerCase() ===
        encodeCategoryPath(category || "Uncategorized")?.toLowerCase())
  );

  if (note && "rawContent" in note) {
    const parsedData = parseNoteContent(
      (note as any).rawContent || "",
      note.id || ""
    );
    const existingUuid = parsedData.uuid || note.uuid;

    let finalUuid = existingUuid;
    if (!finalUuid && username) {
      const { generateUuid, updateYamlMetadata } = await import(
        "@/app/_utils/yaml-metadata-utils"
      );
      finalUuid = generateUuid();

      try {
        const updatedContent = updateYamlMetadata((note as any).rawContent, {
          uuid: finalUuid,
          title: parsedData.title || note.id?.replace(/-/g, " "),
        });

        const fs = await import("fs/promises");
        const path = await import("path");

        const dataDir = path.join(process.cwd(), "data");
        const userDir = path.join(dataDir, NOTES_FOLDER, username);
        const decodedCategory = decodeURIComponent(
          note.category || "Uncategorized"
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
  } = options;

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

    const notes: any[] = await _readNotesRecursively(
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

        if (isRaw) {
          const rawNote: Note & { rawContent: string } = {
            id: sharedItem.id || sharedItem.uuid || "unknown",
            title: sharedItem.id || sharedItem.uuid || "Unknown Note",
            content: "",
            itemType: ItemTypes.NOTE,
            category: decodedCategory,
            createdAt: stats.birthtime.toISOString(),
            updatedAt: stats.mtime.toISOString(),
            owner: sharedItem.sharer,
            isShared: true,
            rawContent: content,
          };
          notes.push(rawNote);
        } else {
          const fileName = `${sharedItem.id}.md`;
          notes.push(
            _parseMarkdownNote(
              content,
              sharedItem.id || sharedItem.uuid || "unknown",
              decodedCategory,
              sharedItem.sharer,
              true,
              stats,
              fileName
            )
          );
        }
      } catch (error) {
        console.error(`Error reading shared note ${sharedItem.id}:`, error);
        console.error(`File path attempted:`, sharedFilePath);
        continue;
      }
    }

    if (projection && projection.length > 0) {
      const projectedNotes = notes.map((note: any) => {
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

    return { success: true, data: notes as Note[] };
  } catch (error) {
    console.error("Error in getNotesUnified:", error);
    return { success: false, error: "Failed to fetch notes" };
  }
};

export const CheckForNeedsMigration = async (): Promise<boolean> => {
  const needsMigration = await _checkForMigrationNeeded();
  const isLoggedIn = await isAuthenticated();
  if (needsMigration && isLoggedIn) {
    redirect("/migration");
  }

  return false;
};

export const cloneNote = async (formData: FormData) => {
  try {
    const id = formData.get("id") as string;
    const category = formData.get("category") as string;
    const ownerUsername = formData.get("user") as string | null;

    const note = await getNoteById(id, ownerUsername || undefined, category);
    if (!note) {
      return { error: "Note not found" };
    }

    const currentUser = await getCurrentUser();
    const userDir = await getUserModeDir(Modes.NOTES);

    const isOwnedByCurrentUser =
      !note.owner || note.owner === currentUser?.username;
    const targetCategory = isOwnedByCurrentUser
      ? category || "Uncategorized"
      : "Uncategorized";

    const categoryDir = path.join(userDir, targetCategory);
    await ensureDir(categoryDir);

    const cloneTitle = `${note.title} (Copy)`;
    const fileRenameMode = currentUser?.fileRenameMode || "minimal";
    const filename = await generateUniqueFilename(categoryDir, cloneTitle, ".md", fileRenameMode);
    const filePath = path.join(categoryDir, filename);

    const content = note.content || "";
    const updatedContent = updateYamlMetadata(content, {
      uuid: generateUuid(),
      title: cloneTitle,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await serverWriteFile(filePath, updatedContent);

    const newId = path.basename(filename, ".md");
    const clonedNote = await getNoteById(
      newId,
      targetCategory,
      currentUser?.username
    );

    try {
      revalidatePath("/");
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but note was cloned successfully:",
        error
      );
    }

    return { success: true, data: clonedNote };
  } catch (error) {
    console.error("Error cloning note:", error);
    return { error: "Failed to clone note" };
  }
};
