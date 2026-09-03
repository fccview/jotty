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
  serverDeleteFile,
  serverWriteFile,
} from "@/app/_server/actions/file";
import { revalidatePath } from "next/cache";
import { NOTES_DIR } from "@/app/_consts/files";
import { PermissionTypes, Modes } from "@/app/_types/enums";
import { sanitizeMarkdown } from "@/app/_utils/markdown-utils";
import { extractHashtagsFromContent } from "@/app/_utils/tag-utils";
import { getFormData } from "@/app/_utils/global-utils";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import {
  updateIndexForItem,
  parseInternalLinks,
  removeItemFromIndex,
  rebuildLinkIndexInternal,
} from "@/app/_server/actions/link";
import { canReach } from "@/app/_server/actions/share/queries";
import {
  extractYamlMetadata as stripYaml,
  generateUuid,
  updateYamlMetadata,
  strayMeta,
  keptMeta,
} from "@/app/_utils/yaml-metadata-utils";
import { getSettings } from "@/app/_server/actions/config";
import { logContentEvent } from "@/app/_server/actions/log";
import { commitNote } from "@/app/_server/actions/history";
import { noteToMarkdown, convertInternalLinksToNewFormat } from "./parsers";
import { getNoteById } from "./queries";
import {
  targetDir,
  bouncer,
  shownAs,
  movePlan,
  refusalMessage,
} from "@/app/_server/actions/share/target";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { claimedName } from "@/app/_server/actions/lib/actor";
import { makeNote } from "./creator";

const _noteDirFor = (owner: string, category?: string): string =>
  path.join(process.cwd(), NOTES_DIR(owner), category || UNCATEGORIZED);

const _namedIn = (user: unknown): string | undefined => {
  if (typeof user === "string") return user || undefined;

  const named = (user as { username?: unknown })?.username;
  return typeof named === "string" ? named : undefined;
};

export const createNote = async (formData: FormData) => {
  const actor = await getCurrentUser();

  if (!actor?.username) {
    return { error: "Not authenticated" };
  }

  const claimed = claimedName(formData);

  if (claimed && claimed !== actor.username) {
    console.error(
      "Refusing note creation, claimed identity does not match session:",
      actor.username,
    );
    return { error: "Identity mismatch" };
  }

  return makeNote(actor, formData);
};

export const updateNote = async (formData: FormData, autosaveNotes = false) => {
  try {
    const { title, content, category, user, uuid } = getFormData(formData, [
      "title",
      "content",
      "category",
      "user",
      "uuid",
    ]);
    const settings = await getSettings();

    const actingUsername = (await getUsername()) || _namedIn(user);

    if (!actingUsername) {
      return { error: "Not authenticated" };
    }

    const note = await getNoteById(uuid);

    if (!note) {
      throw new Error("Note not found");
    }

    const canEdit = await canReach(
      note.uuid!,
      "note",
      actingUsername,
      PermissionTypes.EDIT,
    );

    if (!canEdit) {
      return { error: "Permission denied" };
    }

    const shownSource = await shownAs(
      Modes.NOTES,
      actingUsername,
      note.owner!,
      note.category || "",
    );

    const shownCategory = category || shownSource;
    const { home, destination, target, isMoving } = await movePlan(
      Modes.NOTES,
      actingUsername,
      note,
      shownCategory,
    );

    if (isMoving) {
      const verdict = await bouncer(
        target,
        actingUsername,
        PermissionTypes.CREATE,
      );

      if (!verdict.allowed) {
        return { error: verdict.error };
      }

      const canRemove = await canReach(
        note.uuid!,
        "note",
        actingUsername,
        PermissionTypes.DELETE,
      );

      if (!canRemove) {
        return { error: await refusalMessage() };
      }
    }

    const sanitizedContent = sanitizeMarkdown(content);
    const { metadata: incomingMeta, contentWithoutMetadata } =
      stripYaml(sanitizedContent);
    const processedContent = settings?.editor?.enableBilateralLinks
      ? await convertInternalLinksToNewFormat(
          contentWithoutMetadata,
          actingUsername,
          note.category,
        )
      : contentWithoutMetadata;

    const convertedContent = processedContent;

    const encryptionMethod =
      detectEncryptionMethod(convertedContent) || undefined;

    const extractedTags = extractHashtagsFromContent(convertedContent);
    const sortedTags = Array.from(new Set(extractedTags)).sort();

    const updatedDoc = {
      ...note,
      title,
      content: convertedContent,
      category: destination.category,
      owner: destination.owner,
      updatedAt: new Date().toISOString(),
      encrypted: isEncrypted(convertedContent),
      encryptionMethod,
      tags: sortedTags.length > 0 ? sortedTags : undefined,
      extraMetadata: keptMeta(note.extraMetadata, strayMeta(incomingMeta)),
    };

    const sourceDir = _noteDirFor(home.owner, home.category);
    const categoryDir = _noteDirFor(destination.owner, destination.category);
    await ensureDir(categoryDir);

    const currentId = note.id;
    let newFilename: string;
    let newId = currentId;

    if (title !== note.title) {
      const ownerUser = await getCurrentUser();
      const fileRenameMode = ownerUser?.fileRenameMode || "minimal";
      newFilename = await generateUniqueFilename(
        categoryDir,
        title,
        ".md",
        fileRenameMode,
      );
      newId = path.basename(newFilename, ".md");
    } else {
      newFilename = `${currentId}.md`;
    }

    if (newId !== currentId) {
      updatedDoc.id = newId;
    }

    const filePath = path.join(categoryDir, newFilename);

    const oldFilePath =
      isMoving || newId !== currentId
        ? path.join(sourceDir, `${currentId}.md`)
        : null;

    await serverWriteFile(filePath, noteToMarkdown(updatedDoc));

    if (!autosaveNotes && !updatedDoc.encrypted) {
      const historyRelativePath = path.join(
        updatedDoc.category || UNCATEGORIZED,
        `${newId}.md`,
      );

      const historyAction = isMoving ? "move" : "update";

      const historyMetadata = isMoving
        ? {
            oldCategory: home.category || UNCATEGORIZED,
            newCategory: updatedDoc.category || UNCATEGORIZED,
            oldPath: path.join(
              home.category || UNCATEGORIZED,
              `${currentId}.md`,
            ),
          }
        : undefined;

      commitNote(
        destination.owner,
        historyRelativePath,
        historyAction,
        title,
        historyMetadata,
      ).catch(() => {});
    }

    if (settings?.editor?.enableBilateralLinks) {
      try {
        const links = (await parseInternalLinks(updatedDoc.content)) || [];
        const newItemKey = `${updatedDoc.category || UNCATEGORIZED}/${
          updatedDoc.id
        }`;

        const oldItemKey = `${home.category || UNCATEGORIZED}/${currentId}`;

        if (oldItemKey !== newItemKey || isMoving) {
          await rebuildLinkIndexInternal(home.owner);

          if (destination.owner !== home.owner) {
            await rebuildLinkIndexInternal(destination.owner);
          }

          revalidatePath("/");
        }

        await updateIndexForItem(
          destination.owner,
          "note",
          updatedDoc.uuid!,
          links,
        );
      } catch (error) {
        console.warn(
          "Failed to update link index for note:",
          updatedDoc.id,
          error,
        );
      }
    }

    if (oldFilePath && oldFilePath !== filePath) {
      await serverDeleteFile(oldFilePath);
    }

    try {
      if (!autosaveNotes) {
        revalidatePath("/");
        revalidatePath(`/note/${note.uuid}`);
      }
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error,
      );
    }

    if (!updatedDoc.encrypted) {
      await logContentEvent(
        "note_updated",
        "note",
        note.uuid!,
        updatedDoc.title,
        true,
        { category: updatedDoc.category },
      );
    }

    await broadcast({
      type: "note",
      action: "updated",
      entityId: updatedDoc.uuid,
      username: actingUsername,
    });

    return {
      success: true,
      data: { ...updatedDoc, category: shownCategory },
    };
  } catch (error) {
    const { title, uuid } = getFormData(formData, ["title", "uuid"]);
    await logContentEvent(
      "note_updated",
      "note",
      uuid!,
      title || "unknown",
      false,
    );
    return { error: "Failed to update note" };
  }
};

export const deleteNote = async (formData: FormData, username?: string) => {
  try {
    const { uuid } = getFormData(formData, ["uuid"]);

    let currentUser: any = null;
    if (username) {
      const { findUserRecord } =
        await import("@/app/_server/actions/users/records");
      const userResult = await findUserRecord(username);
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

    const note = await getNoteById(uuid!);

    if (!note) {
      return { error: "Document not found" };
    }

    const canDelete = await canReach(
      note.uuid!,
      "note",
      currentUser.username,
      PermissionTypes.DELETE,
    );

    if (!canDelete) {
      return { error: "Permission denied" };
    }

    const ownerUsername = note.owner || currentUser.username;
    const source = await targetDir(
      Modes.NOTES,
      currentUser.username,
      note.category || "",
    );

    const verdict = await bouncer(
      source,
      currentUser.username,
      PermissionTypes.DELETE,
    );

    if (!verdict.allowed) {
      return { error: verdict.error };
    }

    const homeCategory = note.category || UNCATEGORIZED;
    const ownerDir = NOTES_DIR(ownerUsername);
    const filePath = path.join(ownerDir, homeCategory, `${note.id}.md`);

    await serverDeleteFile(filePath);

    if (!note.encrypted) {
      const deleteRelativePath = path.join(homeCategory, `${note.id}.md`);
      commitNote(
        ownerUsername,
        deleteRelativePath,
        "delete",
        note.title || note.id,
      ).catch(() => {});
    }

    try {
      await removeItemFromIndex(note.owner!, "note", note.uuid!);
    } catch (error) {
      console.warn("Failed to remove note from link index:", note.id, error);
    }

    try {
      revalidatePath("/");
      revalidatePath(`/note/${note.uuid}`);
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error,
      );
    }

    await logContentEvent(
      "note_deleted",
      "note",
      note.uuid!,
      note.title!,
      true,
      { category: note.category },
    );

    await broadcast({
      type: "note",
      action: "deleted",
      entityId: note.uuid,
      username: currentUser.username,
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting note:", error);

    const { uuid } = getFormData(formData, ["uuid"]);

    let title = "unknown";
    try {
      const note = await getNoteById(uuid!);
      title = note?.title || "unknown";
    } catch (lookupError) {
      console.warn(
        "Failed to re-read note while logging deletion:",
        lookupError,
      );
    }

    await logContentEvent("note_deleted", "note", uuid!, title, false);
    return { error: "Failed to delete note" };
  }
};

export const cloneNote = async (formData: FormData) => {
  try {
    const uuid = formData.get("uuid") as string;
    const targetCategory = formData.get("category") as string;
    const ownerUsername = formData.get("user") as string | null;

    const note = await getNoteById(uuid, ownerUsername || undefined);
    if (!note) {
      return { error: "Note not found" };
    }

    const currentUser = await getCurrentUser();

    if (!currentUser?.username) {
      return { error: "Not authenticated" };
    }

    const canReadSource = await canReach(
      note.uuid!,
      "note",
      currentUser.username,
      PermissionTypes.READ,
    );

    if (!canReadSource) {
      return { error: "Permission denied" };
    }

    const isOwnedByCurrentUser =
      !note.owner || note.owner === currentUser.username;
    const shownCategory = isOwnedByCurrentUser
      ? targetCategory || UNCATEGORIZED
      : UNCATEGORIZED;

    const target = await targetDir(
      Modes.NOTES,
      currentUser.username,
      shownCategory,
    );

    const verdict = await bouncer(
      target,
      currentUser.username,
      PermissionTypes.EDIT,
    );

    if (!verdict.allowed) {
      return { error: verdict.error };
    }

    const categoryDir = target.dir;
    await ensureDir(categoryDir);

    const cloneTitle = `${note.title} (Copy)`;
    const fileRenameMode = currentUser?.fileRenameMode || "minimal";
    const filename = await generateUniqueFilename(
      categoryDir,
      cloneTitle,
      ".md",
      fileRenameMode,
    );
    const filePath = path.join(categoryDir, filename);

    const content = note.content || "";
    const cloneUuid = generateUuid();
    const { metadata: sourceMeta, contentWithoutMetadata } = stripYaml(content);
    delete (sourceMeta as Record<string, unknown>).sharedWith;

    const updatedContent = updateYamlMetadata(
      contentWithoutMetadata,
      {
        ...(note.extraMetadata || {}),
        ...sourceMeta,
        uuid: cloneUuid,
        title: cloneTitle,
        owner: target.owner,
        category: target.category,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      false,
    );

    await serverWriteFile(filePath, updatedContent);

    const clonedNote = await getNoteById(cloneUuid, currentUser.username);

    try {
      revalidatePath("/");
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but note was cloned successfully:",
        error,
      );
    }

    await broadcast({
      type: "note",
      action: "created",
      entityId: cloneUuid,
      username: currentUser?.username || "",
    });

    return { success: true, data: clonedNote };
  } catch (error) {
    console.error("Error cloning note:", error);
    return { error: "Failed to clone note" };
  }
};
