"use server";

import { Checklist, TimeEntry } from "@/app/_types";
import { ItemTypes, PermissionTypes } from "@/app/_types/enums";
import { getCurrentUser } from "@/app/_server/actions/users";
import { getListById } from "@/app/_server/actions/checklist";
import { checkUserPermission } from "@/app/_server/actions/sharing";
import { getFormData } from "@/app/_utils/global-utils";
import { updateItem, findItem } from "@/app/_utils/item-tree-utils";
import path from "path";
import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";
import { getUserModeDir, serverWriteFile } from "@/app/_server/actions/file";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { Modes } from "@/app/_types/enums";
import { revalidatePath } from "next/cache";
import { broadcast } from "@/app/_server/ws/broadcast";

const _getFilePath = async (list: Checklist): Promise<string> => {
  const categoryDir = list.category || "Uncategorized";
  const filename = `${list.id}.md`;

  if (list.owner) {
    return path.join(
      process.cwd(), "data", CHECKLISTS_FOLDER, list.owner, categoryDir, filename
    );
  }

  const userDir = await getUserModeDir(Modes.CHECKLISTS);
  return path.join(userDir, categoryDir, filename);
};

async function _saveAndBroadcast(list: Checklist, username: string) {
  const filePath = await _getFilePath(list);
  await serverWriteFile(filePath, listToMarkdown(list));

  await broadcast({
    type: "checklist",
    action: "updated",
    entityId: list.uuid || list.id,
    username,
  });

  try {
    revalidatePath("/");
  } catch {}
}

export const editTimeEntry = async (formData: FormData) => {
  try {
    const { listId, itemId, entryId, category } = getFormData(formData, [
      "listId", "itemId", "entryId", "category",
    ]);

    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;
    const duration = formData.get("duration") as string;

    const currentUser = await getCurrentUser();
    if (!currentUser) return { error: "Not authenticated" };

    const list = await getListById(listId, currentUser.username, category);
    if (!list) return { error: "List not found" };

    const canEdit = await checkUserPermission(
      list.uuid || listId, category, ItemTypes.CHECKLIST, currentUser.username, PermissionTypes.EDIT
    );
    if (!canEdit) return { error: "Permission denied" };

    const existingItem = findItem(list.items, itemId);
    if (!existingItem) return { error: "Item not found" };

    const entryIndex = existingItem.timeEntries?.findIndex((e) => e.id === entryId);
    if (entryIndex === undefined || entryIndex === -1) return { error: "Time entry not found" };

    const now = new Date().toISOString();
    const updatedList: Checklist = {
      ...list,
      items: updateItem(list.items, itemId, (item) => ({
        ...item,
        timeEntries: (item.timeEntries || []).map((entry) => {
          if (entry.id !== entryId) return entry;
          const updated: TimeEntry = { ...entry };
          if (startTime) updated.startTime = startTime;
          if (endTime) updated.endTime = endTime;
          if (duration) updated.duration = parseInt(duration);
          return updated;
        }),
        lastModifiedBy: currentUser.username,
        lastModifiedAt: now,
      })),
      updatedAt: now,
    };

    await _saveAndBroadcast(updatedList, currentUser.username);
    return { success: true, data: updatedList };
  } catch (error) {
    console.error("Error editing time entry:", error);
    return { error: "Failed to edit time entry" };
  }
};

export const deleteTimeEntry = async (formData: FormData) => {
  try {
    const { listId, itemId, entryId, category } = getFormData(formData, [
      "listId", "itemId", "entryId", "category",
    ]);

    const currentUser = await getCurrentUser();
    if (!currentUser) return { error: "Not authenticated" };

    const list = await getListById(listId, currentUser.username, category);
    if (!list) return { error: "List not found" };

    const canEdit = await checkUserPermission(
      list.uuid || listId, category, ItemTypes.CHECKLIST, currentUser.username, PermissionTypes.EDIT
    );
    if (!canEdit) return { error: "Permission denied" };

    const existingItem = findItem(list.items, itemId);
    if (!existingItem) return { error: "Item not found" };

    const now = new Date().toISOString();
    const updatedList: Checklist = {
      ...list,
      items: updateItem(list.items, itemId, (item) => ({
        ...item,
        timeEntries: (item.timeEntries || []).filter((entry) => entry.id !== entryId),
        lastModifiedBy: currentUser.username,
        lastModifiedAt: now,
      })),
      updatedAt: now,
    };

    await _saveAndBroadcast(updatedList, currentUser.username);
    return { success: true, data: updatedList };
  } catch (error) {
    console.error("Error deleting time entry:", error);
    return { error: "Failed to delete time entry" };
  }
};
