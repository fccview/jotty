"use server";

import path from "path";
import { generateUniqueFilename } from "@/app/_utils/filename-utils";
import { getCurrentUser } from "@/app/_server/actions/users";
import { ensureDir, serverWriteFile } from "@/app/_server/actions/file";
import { revalidatePath } from "next/cache";
import { PermissionTypes, Modes } from "@/app/_types/enums";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { canReach } from "@/app/_server/actions/share/queries";
import {
  extractYamlMetadata as stripYaml,
  generateUuid,
  updateYamlMetadata,
} from "@/app/_utils/yaml-metadata-utils";
import { getNoteById } from "./queries";
import { targetDir, bouncer } from "@/app/_server/actions/share/target";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { claimedName } from "@/app/_server/actions/lib/actor";
import { makeNote } from "./creator";
import { dropNote, editNote } from "./editor";
import { fenceFilename } from "@/app/_server/actions/lib/filename-fence";

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

export const cloneNote = async (formData: FormData) => {
  try {
    const uuid = formData.get("uuid") as string;
    const targetCategory = formData.get("category") as string;
    const currentUser = await getCurrentUser();

    if (!currentUser?.username) {
      return { error: "Not authenticated" };
    }

    const note = await getNoteById(uuid);
    if (!note) {
      return { error: "Note not found" };
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
    const straying = await fenceFilename(categoryDir, filename);
    if (straying) {
      return { error: straying };
    }

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

export const updateNote = async (
  formData: FormData,
  autosaveNotes = false,
) => {
  const actor = await getCurrentUser();

  if (!actor?.username) {
    return { error: "Not authenticated" };
  }

  return editNote(actor, formData, autosaveNotes);
};

export const deleteNote = async (formData: FormData) => {
  const actor = await getCurrentUser();

  if (!actor?.username) {
    return { error: "Not authenticated" };
  }

  return dropNote(actor, formData);
};
