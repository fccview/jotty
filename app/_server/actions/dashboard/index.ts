"use server";

import { AppMode, Checklist, ItemType, Note, Result } from "@/app/_types";
import { ItemTypes, Modes } from "@/app/_types/enums";
import { updateList } from "../checklist";
import { updateNote } from "../note";
import { getNoteById } from "../note/queries";
import { getCurrentUser } from "../users";
import { mutateUsers } from "../users/records";
import { broadcast } from "../ws/broadcast";
import { ARCHIVED_DIR_NAME } from "@/app/_consts/files";
import { isPinnedEntry } from "@/app/_utils/global-utils";
import { isLockedUuid } from "@/app/_server/actions/share/queries";
import { lockedNotice } from "@/app/_server/actions/lib/read-only-message";

const PIN_KEYS = {
  [ItemTypes.CHECKLIST]: "pinnedLists",
  [ItemTypes.NOTE]: "pinnedNotes",
} as const;

const _pinKey = (type: ItemType) =>
  type === ItemTypes.CHECKLIST ? PIN_KEYS[ItemTypes.CHECKLIST] : PIN_KEYS[ItemTypes.NOTE];

const _reorderPins = (pinned: string[], order: string[]): string[] => {
  const moved = order
    .map((uuid) => pinned.find((entry) => isPinnedEntry(entry, uuid)))
    .filter((entry): entry is string => Boolean(entry));
  const untouched = pinned.filter((entry) => !moved.includes(entry));
  return Array.from(new Set([...moved, ...untouched]));
};

const _mutatePins = async (
  username: string,
  type: ItemType,
  change: (pinned: string[]) => string[],
): Promise<boolean> => {
  const key = _pinKey(type);
  const saved = await mutateUsers((users) => {
    const user = users.find((entry) => entry.username === username);
    if (!user) return null;
    user[key] = change(user[key] || []);
    return true;
  });

  if (!saved) return false;

  await broadcast({ type: "settings", action: "updated", username, recipient: username });
  return true;
};

export const togglePin = async (
  uuid: string,
  type: ItemType
): Promise<Result<null>> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Not authenticated" };
    }

    if (await isLockedUuid(type, uuid)) {
      return { success: false, error: await lockedNotice() };
    }

    const saved = await _mutatePins(currentUser.username, type, (pinned) =>
      pinned.some((entry) => isPinnedEntry(entry, uuid))
        ? pinned.filter((entry) => !isPinnedEntry(entry, uuid))
        : [...pinned, uuid],
    );

    return saved
      ? { success: true, data: null }
      : { success: false, error: "Failed to toggle pin" };
  } catch (error) {
    console.error(`Error toggling pin for ${type}:`, error);
    return { success: false, error: "Failed to toggle pin" };
  }
};

export const updatePinnedOrder = async (
  newOrder: string[],
  type: ItemType
): Promise<Result<null>> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Not authenticated" };
    }

    const saved = await _mutatePins(currentUser.username, type, (pinned) =>
      _reorderPins(pinned, newOrder),
    );

    return saved
      ? { success: true, data: null }
      : { success: false, error: "Failed to update pinned order" };
  } catch (error) {
    console.error(`Error updating pinned order for ${type}:`, error);
    return { success: false, error: "Failed to update pinned order" };
  }
};

export const toggleArchive = async (
  item: Checklist | Note,
  mode: AppMode,
  newCategory?: string
): Promise<{ success: boolean; data?: Checklist | Note; error?: string }> => {
  const currentUser = await getCurrentUser();
  const isOwner = !item.owner || currentUser?.username === item.owner;
  const formData = new FormData();

  formData.append("uuid", item.uuid!);
  formData.append("title", item.title);

  if (item.owner) {
    formData.append("user", item.owner);
  }

  if (mode === Modes.NOTES) {
    const noteItem = item as Note;
    let content = noteItem.content;
    if (content === undefined || content === null) {
      const fullNote = await getNoteById(noteItem.uuid!);
      content = fullNote?.content || "";
    }
    formData.append("content", content);
  }

  if (isOwner) {
    formData.append("category", newCategory || ARCHIVED_DIR_NAME);
  }

  let result: Result<Checklist | Note>;
  if (mode === Modes.NOTES) {
    result = (await updateNote(formData, false)) as Result<Note>;
  } else {
    result = (await updateList(formData)) as Result<Checklist>;
  }

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, error: result.error };
};
