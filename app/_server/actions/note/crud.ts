"use server";

import path from "path";
import { Note } from "@/app/_types";
import { generateUniqueFilename } from "@/app/_utils/filename-utils";
import {
  detectEncryptionMethod,
  isEncrypted,
} from "@/app/_utils/encryption-utils";
import { getCurrentUser, getUsername } from "@/app/_server/actions/users";
import {
  ensureDir,
  getUserModeDir,
  serverDeleteFile,
  serverWriteFile,
} from "@/app/_server/actions/file";
import { revalidatePath } from "next/cache";
import { NOTES_DIR } from "@/app/_consts/files";
import { PermissionTypes, Modes } from "@/app/_types/enums";
import { sanitizeMarkdown } from "@/app/_utils/markdown-utils";
import { extractHashtagsFromContent } from "@/app/_utils/tag-utils";
import { buildCategoryPath, getFormData } from "@/app/_utils/global-utils";
import {
  updateIndexForItem,
  parseInternalLinks,
  removeItemFromIndex,
  rebuildLinkIndex,
} from "@/app/_server/actions/link";
import { checkUserPermission } from "@/app/_server/actions/sharing";
import {
  extractYamlMetadata as stripYaml,
  generateUuid,
  updateYamlMetadata,
} from "@/app/_utils/yaml-metadata-utils";
import { getSettings } from "@/app/_server/actions/config";
import { logContentEvent } from "@/app/_server/actions/log";
import { commitNote } from "@/app/_server/actions/history";
import { noteToMarkdown, convertInternalLinksToNewFormat } from "./parsers";
import { getNoteById } from "./queries";
import { broadcast } from "@/app/_server/ws/broadcast";

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
    const filename = await generateUniqueFilename(
      categoryDir,
      title,
      ".md",
      fileRenameMode
    );
    const id = path.basename(filename, ".md");
    const filePath = path.join(categoryDir, filename);

    const extractedTags = extractHashtagsFromContent(content);

    const newDoc: Note = {
      id,
      uuid: generateUuid(),
      title,
      content,
      category,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      owner: currentUser.username,
      tags: extractedTags.length > 0 ? extractedTags : undefined,
    };

    await serverWriteFile(filePath, noteToMarkdown(newDoc));

    const relativePath = path.join(category, `${id}.md`);
    if (!isEncrypted(content)) {
      commitNote(currentUser.username, relativePath, "create", title).catch(
        () => {}
      );
    }

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

    await logContentEvent(
      "note_created",
      "note",
      newDoc.uuid!,
      newDoc.title,
      true,
      { category: newDoc.category }
    );

    await broadcast({ type: "note", action: "created", entityId: newDoc.uuid, username: currentUser.username });

    return { success: true, data: newDoc };
  } catch (error) {
    const { title } = getFormData(formData, ["title"]);
    console.error("Error creating note:", error);
    await logContentEvent(
      "note_created",
      "note",
      "",
      title || "unknown",
      false
    );
    return { error: "Failed to create note" };
  }
};

export const updateNote = async (formData: FormData, autosaveNotes = false) => {
  try {
    const { id, title, content, category, originalCategory, user, uuid } =
      getFormData(formData, [
        "id",
        "title",
        "content",
        "category",
        "originalCategory",
        "user",
        "uuid",
      ]);
    const settings = await getSettings();

    let currentUser = user;

    if (!currentUser) {
      currentUser = await getUsername();
    }

    const actingUsername =
      typeof currentUser === "string"
        ? currentUser
        : (currentUser as { username?: string })?.username;

    if (!actingUsername) {
      return { error: "Not authenticated" };
    }

    const sanitizedContent = sanitizeMarkdown(content);
    const { contentWithoutMetadata } = stripYaml(sanitizedContent);
    const processedContent = settings?.editor?.enableBilateralLinks
      ? await convertInternalLinksToNewFormat(
          contentWithoutMetadata,
          currentUser,
          originalCategory
        )
      : contentWithoutMetadata;

    const convertedContent = processedContent;

    const note = await getNoteById(uuid || id, originalCategory, undefined);

    if (!note) {
      throw new Error("Note not found");
    }

    const canEdit = await checkUserPermission(
      note.uuid || id,
      originalCategory,
      "note",
      actingUsername,
      PermissionTypes.EDIT
    );

    if (!canEdit) {
      return { error: "Permission denied" };
    }

    const encryptionMethod =
      detectEncryptionMethod(convertedContent) || undefined;

    const extractedTags = extractHashtagsFromContent(convertedContent);
    const sortedTags = Array.from(new Set(extractedTags)).sort();

    const updatedDoc = {
      ...note,
      title,
      content: convertedContent,
      category: category || note.category,
      updatedAt: new Date().toISOString(),
      encrypted: isEncrypted(convertedContent),
      encryptionMethod,
      tags: sortedTags.length > 0 ? sortedTags : undefined,
    };

    const ownerDir = NOTES_DIR(note.owner!);
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
      newFilename = await generateUniqueFilename(
        categoryDir,
        title,
        ".md",
        fileRenameMode
      );
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

    await serverWriteFile(filePath, noteToMarkdown(updatedDoc));

    if (!autosaveNotes && !updatedDoc.encrypted) {
      const historyRelativePath = path.join(
        updatedDoc.category || "Uncategorized",
        `${newId}.md`
      );

      const isCategoryChange = category && category !== note.category;
      const historyAction = isCategoryChange ? "move" : "update";

      const historyMetadata = isCategoryChange
        ? {
            oldCategory: note.category || "Uncategorized",
            newCategory: updatedDoc.category || "Uncategorized",
            oldPath: path.join(note.category || "Uncategorized", `${id}.md`),
          }
        : undefined;

      commitNote(
        note.owner!,
        historyRelativePath,
        historyAction,
        title,
        historyMetadata
      ).catch(() => {});
    }

    if (settings?.editor?.enableBilateralLinks) {
      try {
        const links = (await parseInternalLinks(updatedDoc.content)) || [];
        const newItemKey = `${updatedDoc.category || "Uncategorized"}/${
          updatedDoc.id
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
      await logContentEvent(
        "note_updated",
        "note",
        note.uuid!,
        updatedDoc.title,
        true,
        { category: updatedDoc.category }
      );
    }

    await broadcast({ type: "note", action: "updated", entityId: updatedDoc.uuid, username: currentUser });

    return { success: true, data: updatedDoc };
  } catch (error) {
    const { title, uuid } = getFormData(formData, ["title", "uuid"]);
    await logContentEvent(
      "note_updated",
      "note",
      uuid!,
      title || "unknown",
      false
    );
    return { error: "Failed to update note" };
  }
};

export const deleteNote = async (formData: FormData, username?: string) => {
  try {
    const { id, category, uuid } = getFormData(formData, [
      "id",
      "category",
      "uuid",
    ]);
    const itemIdentifier = uuid || id;

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

    const note = await getNoteById(itemIdentifier, category, undefined);

    if (!note) {
      return { error: "Document not found" };
    }

    const canDelete = await checkUserPermission(
      note.uuid || itemIdentifier,
      category,
      "note",
      currentUser.username,
      PermissionTypes.DELETE
    );

    if (!canDelete) {
      return { error: "Permission denied" };
    }

    const ownerUsername = note.owner || currentUser.username;
    const ownerDir = NOTES_DIR(ownerUsername);
    const filePath = path.join(
      ownerDir,
      note.category || "Uncategorized",
      `${note.id}.md`
    );

    await serverDeleteFile(filePath);

    if (!note.encrypted) {
      const deleteRelativePath = path.join(
        note.category || "Uncategorized",
        `${note.id}.md`
      );
      commitNote(
        ownerUsername,
        deleteRelativePath,
        "delete",
        note.title || note.id
      ).catch(() => {});
    }

    try {
      await removeItemFromIndex(note.owner!, "note", note.uuid!);
    } catch (error) {
      console.warn("Failed to remove note from link index:", note.id, error);
    }

    if (note.owner) {
      const { updateSharingData } = await import(
        "@/app/_server/actions/sharing"
      );
      await updateSharingData(
        {
          uuid: note.uuid,
          id: note.id,
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
        note.id
      );
      revalidatePath(`/note/${categoryPath}`);
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error
      );
    }

    await logContentEvent(
      "note_deleted",
      "note",
      note.uuid!,
      note.title!,
      true,
      { category: note.category }
    );

    await broadcast({ type: "note", action: "deleted", entityId: note.uuid || note.id, username: currentUser.username });

    return { success: true };
  } catch (error) {
    const { uuid } = getFormData(formData, ["uuid"]);
    const note = await getNoteById(uuid!, "");
    await logContentEvent(
      "note_deleted",
      "note",
      uuid!,
      note?.title || "unknown",
      false
    );
    return { error: "Failed to delete note" };
  }
};

export const cloneNote = async (formData: FormData) => {
  try {
    const id = formData.get("id") as string;
    const uuid = formData.get("uuid") as string;
    const originalCategory = formData.get("originalCategory") as string | null;
    const targetCategory = formData.get("category") as string;
    const ownerUsername = formData.get("user") as string | null;

    const note = await getNoteById(
      uuid || id,
      originalCategory || undefined,
      ownerUsername || undefined
    );
    if (!note) {
      return { error: "Note not found" };
    }

    const currentUser = await getCurrentUser();
    const userDir = await getUserModeDir(Modes.NOTES);

    const isOwnedByCurrentUser =
      !note.owner || note.owner === currentUser?.username;
    const finalTargetCategory = isOwnedByCurrentUser
      ? targetCategory || "Uncategorized"
      : "Uncategorized";

    const categoryDir = path.join(userDir, finalTargetCategory);
    await ensureDir(categoryDir);

    const cloneTitle = `${note.title} (Copy)`;
    const fileRenameMode = currentUser?.fileRenameMode || "minimal";
    const filename = await generateUniqueFilename(
      categoryDir,
      cloneTitle,
      ".md",
      fileRenameMode
    );
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
      finalTargetCategory,
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

    await broadcast({ type: "note", action: "created", entityId: newId, username: currentUser?.username || "" });

    return { success: true, data: clonedNote };
  } catch (error) {
    console.error("Error cloning note:", error);
    return { error: "Failed to clone note" };
  }
};
