"use server";

import path from "path";
import { Checklist, Item } from "@/app/_types";
import { ItemTypes, Modes, PermissionTypes } from "@/app/_types/enums";
import { getCurrentUser } from "@/app/_server/actions/users";
import { ensureDir, serverWriteFile } from "@/app/_server/actions/file";
import { revalidatePath } from "next/cache";
import { generateUniqueFilename } from "@/app/_utils/filename-utils";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { canReach } from "@/app/_server/actions/share/queries";
import { targetDir, bouncer } from "@/app/_server/actions/share/target";
import { generateUuid } from "@/app/_utils/yaml-metadata-utils";
import { getListById } from "./queries";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { claimedName } from "@/app/_server/actions/lib/actor";
import { makeList } from "./creator";
import { dropList, editList } from "./editor";

export const createList = async (formData: FormData) => {
  const actor = await getCurrentUser();

  if (!actor?.username) {
    return { error: "Not authenticated" };
  }

  const claimed = claimedName(formData);

  if (claimed && claimed !== actor.username) {
    console.error(
      "Refusing checklist creation, claimed identity does not match session:",
      actor.username,
    );
    return { error: "Identity mismatch" };
  }

  return makeList(actor, formData);
};


export const cloneChecklist = async (formData: FormData) => {
  try {
    const uuid = formData.get("uuid") as string;
    const targetCategory = formData.get("category") as string;
    const ownerUsername = formData.get("user") as string | null;

    const checklist = await getListById(uuid, ownerUsername || undefined);
    if (!checklist) {
      return { error: "Checklist not found" };
    }

    const currentUser = await getCurrentUser();

    if (!currentUser?.username) {
      return { error: "Not authenticated" };
    }

    const canReadSource = await canReach(
      checklist.uuid,
      ItemTypes.CHECKLIST,
      currentUser.username,
      PermissionTypes.READ
    );

    if (!canReadSource) {
      return { error: "Permission denied" };
    }

    const isOwnedByCurrentUser =
      !checklist.owner || checklist.owner === currentUser.username;
    const shownCategory = isOwnedByCurrentUser
      ? targetCategory || UNCATEGORIZED
      : UNCATEGORIZED;

    const target = await targetDir(
      Modes.CHECKLISTS,
      currentUser.username,
      shownCategory
    );

    const verdict = await bouncer(
      target,
      currentUser.username,
      PermissionTypes.EDIT
    );

    if (!verdict.allowed) {
      return { error: verdict.error };
    }

    const categoryDir = target.dir;
    await ensureDir(categoryDir);

    const cloneTitle = `${checklist.title} (Copy)`;
    const fileRenameMode = currentUser?.fileRenameMode || "minimal";
    const filename = await generateUniqueFilename(
      categoryDir,
      cloneTitle,
      ".md",
      fileRenameMode
    );
    const filePath = path.join(categoryDir, filename);

    const cloneUuid = generateUuid();
    const content = listToMarkdown({
      ...checklist,
      uuid: cloneUuid,
      title: cloneTitle,
      owner: target.owner,
      category: target.category,
      sharedWith: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await serverWriteFile(filePath, content);

    const clonedChecklist = await getListById(cloneUuid, currentUser.username);

    try {
      revalidatePath("/");
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but checklist was cloned successfully:",
        error
      );
    }

    await broadcast({ type: "checklist", action: "created", entityId: cloneUuid, username: currentUser?.username || "" });

    return { success: true, data: clonedChecklist };
  } catch (error) {
    console.error("Error cloning checklist:", error);
    return { error: "Failed to clone checklist" };
  }
};

export const updateList = async (formData: FormData) => {
  const actor = await getCurrentUser();

  if (!actor?.username) {
    return { error: "Not authenticated" };
  }

  return editList(actor, formData);
};

export const deleteList = async (formData: FormData) => {
  const actor = await getCurrentUser();

  if (!actor?.username) {
    return { error: "Not authenticated" };
  }

  return dropList(actor, formData);
};
