import { AppMode, Checklist, ItemType, Note, Result, User } from "@/app/_types";
import { ItemTypes, Modes } from "@/app/_types/enums";
import { updateList } from "../checklist";
import { updateNote } from "../note";
import { getCurrentUser } from "../users";
import { readJsonFile, writeJsonFile } from "../file";
import { ARCHIVED_DIR_NAME, USERS_FILE } from "@/app/_consts/files";

const _getUserIndex = async (username: string): Promise<number> => {
  const allUsers = await readJsonFile(USERS_FILE);
  return allUsers.findIndex((user: User) => user.username === username);
};

export const togglePin = async (
  itemId: string,
  category: string,
  type: ItemType
): Promise<Result<null>> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Not authenticated" };
    }

    const allUsers = await readJsonFile(USERS_FILE);
    const userIndex = await _getUserIndex(currentUser.username);

    const user = allUsers[userIndex];
    const itemPath = `${category}/${itemId}`;

    if (type === ItemTypes.CHECKLIST) {
      const pinnedLists = user.pinnedLists || [];
      const isPinned = pinnedLists.includes(itemPath);

      if (isPinned) {
        user.pinnedLists = pinnedLists.filter(
          (path: string) => path !== itemPath
        );
      } else {
        user.pinnedLists = [...pinnedLists, itemPath];
      }
    } else {
      const pinnedNotes = user.pinnedNotes || [];
      const isPinned = pinnedNotes.includes(itemPath);

      if (isPinned) {
        user.pinnedNotes = pinnedNotes.filter(
          (path: string) => path !== itemPath
        );
      } else {
        user.pinnedNotes = [...pinnedNotes, itemPath];
      }
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
    const userIndex = await _getUserIndex(currentUser.username);

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
  const isOwner = currentUser?.username === item.owner;
  const formData = new FormData();

  formData.append("id", item.id);
  formData.append("title", item.title);

  if (!formData.get("user") && item.owner) {
    formData.append("user", item.owner);
  }

  if (mode === Modes.NOTES) {
    formData.append("content", (item as Note).content);
  }

  if (isOwner) {
    formData.append("category", newCategory || ARCHIVED_DIR_NAME);
  }

  formData.append("originalCategory", item.category || "Uncategorized");

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
