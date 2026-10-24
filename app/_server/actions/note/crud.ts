"use server";

import { getCurrentUser } from "@/app/_server/actions/users";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { getNoteById } from "./queries";
import { claimedName } from "@/app/_server/actions/lib/actor";
import { makeNote } from "./creator";
import { copyNote } from "./cloner";
import { dropNote, editNote } from "./editor";

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

    const isOwnedByCurrentUser =
      !note.owner || note.owner === currentUser.username;
    const shownCategory = isOwnedByCurrentUser
      ? targetCategory || UNCATEGORIZED
      : UNCATEGORIZED;

    return await copyNote(
      currentUser,
      note,
      shownCategory,
      `${note.title} (Copy)`,
    );
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
