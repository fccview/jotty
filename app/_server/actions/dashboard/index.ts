import { AppMode, Checklist, ItemType, Note, Result } from "@/app/_types";
import { ItemTypes, Modes } from "@/app/_types/enums";
import { updateList } from "../checklist";
import { updateNote, getNoteById } from "../note";
import { getCurrentUser, getUserIndex } from "../users";
import { readJsonFile, writeJsonFile } from "../file";
import { ARCHIVED_DIR_NAME, USERS_FILE } from "@/app/_consts/files";

const _pinMatches = (entry: string, uuid: string): boolean =>
  entry === uuid || entry.split("/").pop() === uuid;

export const togglePin = async (
  uuid: string,
  type: ItemType
): Promise<Result<null>> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Not authenticated" };
    }

    const allUsers = await readJsonFile(USERS_FILE);
    const userIndex = await getUserIndex(currentUser.username);

    const user = allUsers[userIndex];

    if (type === ItemTypes.CHECKLIST) {
      const pinnedLists: string[] = user.pinnedLists || [];
      const isPinned = pinnedLists.some((entry) => _pinMatches(entry, uuid));

      user.pinnedLists = isPinned
        ? pinnedLists.filter((entry) => !_pinMatches(entry, uuid))
        : [...pinnedLists, uuid];
    } else {
      const pinnedNotes: string[] = user.pinnedNotes || [];
      const isPinned = pinnedNotes.some((entry) => _pinMatches(entry, uuid));

      user.pinnedNotes = isPinned
        ? pinnedNotes.filter((entry) => !_pinMatches(entry, uuid))
        : [...pinnedNotes, uuid];
    }

    allUsers[userIndex] = user;
    await writeJsonFile(allUsers, USERS_FILE);

    return { success: true, data: null };
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

    const allUsers = await readJsonFile(USERS_FILE);
    const userIndex = await getUserIndex(currentUser.username);

    const user = allUsers[userIndex];

    if (type === ItemTypes.CHECKLIST) {
      user.pinnedLists = newOrder;
    } else {
      user.pinnedNotes = newOrder;
    }

    allUsers[userIndex] = user;
    await writeJsonFile(allUsers, USERS_FILE);

    return { success: true, data: null };
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
      const fullNote = await getNoteById(noteItem.uuid!, noteItem.owner);
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
