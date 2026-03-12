"use server";

import path from "path";
import { Checklist, Item, KanbanPriority, KanbanReminder } from "@/app/_types";
import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";
import { ItemTypes, Modes, PermissionTypes } from "@/app/_types/enums";
import { getCurrentUser } from "@/app/_server/actions/users";
import { getUserModeDir, serverWriteFile } from "@/app/_server/actions/file";
import { revalidatePath } from "next/cache";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { getFormData } from "@/app/_utils/global-utils";
import { checkUserPermission } from "@/app/_server/actions/sharing";
import { broadcast } from "@/app/_server/ws/broadcast";
import { getListById } from "@/app/_server/actions/checklist";

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

const _findItem = (items: Item[], itemId: string): Item | null => {
  for (const item of items) {
    if (item.id === itemId) return item;
    if (item.children) {
      const found = _findItem(item.children, itemId);
      if (found) return found;
    }
  }
  return null;
};

const _updateItemInList = (items: Item[], itemId: string, updater: (item: Item) => Item): Item[] =>
  items.map((item) => {
    if (item.id === itemId) return updater(item);
    if (item.children) {
      return { ...item, children: _updateItemInList(item.children, itemId, updater) };
    }
    return item;
  });

const _saveAndBroadcast = async (list: Checklist) => {
  const filePath = await _getFilePath(list);
  await serverWriteFile(filePath, listToMarkdown(list));

  const currentUser = await getCurrentUser();
  await broadcast({
    type: "checklist",
    action: "updated",
    entityId: list.uuid || list.id,
    username: currentUser?.username || "",
  });

  try {
    revalidatePath("/");
  } catch {}
};

export const updateKanbanItemPriority = async (formData: FormData) => {
  try {
    const { listId, itemId, priority, category } = getFormData(formData, [
      "listId", "itemId", "priority", "category",
    ]);

    const currentUser = await getCurrentUser();
    if (!currentUser) return { error: "Not authenticated" };

    const canEdit = await checkUserPermission(
      listId, category, ItemTypes.CHECKLIST, currentUser.username, PermissionTypes.EDIT
    );
    if (!canEdit) return { error: "Permission denied" };

    const list = await getListById(listId, undefined, category);
    if (!list) return { error: "List not found" };

    const now = new Date().toISOString();
    const updatedList: Checklist = {
      ...list,
      items: _updateItemInList(list.items, itemId, (item) => ({
        ...item,
        priority: priority as KanbanPriority,
        lastModifiedBy: currentUser.username,
        lastModifiedAt: now,
      })),
      updatedAt: now,
    };

    await _saveAndBroadcast(updatedList);
    return { success: true, data: updatedList };
  } catch (error) {
    console.error("Error updating priority:", error);
    return { error: "Failed to update priority" };
  }
};

export const updateKanbanItemScore = async (formData: FormData) => {
  try {
    const { listId, itemId, score, category } = getFormData(formData, [
      "listId", "itemId", "score", "category",
    ]);

    const currentUser = await getCurrentUser();
    if (!currentUser) return { error: "Not authenticated" };

    const canEdit = await checkUserPermission(
      listId, category, ItemTypes.CHECKLIST, currentUser.username, PermissionTypes.EDIT
    );
    if (!canEdit) return { error: "Permission denied" };

    const list = await getListById(listId, undefined, category);
    if (!list) return { error: "List not found" };

    const now = new Date().toISOString();
    const updatedList: Checklist = {
      ...list,
      items: _updateItemInList(list.items, itemId, (item) => ({
        ...item,
        score: parseInt(score),
        lastModifiedBy: currentUser.username,
        lastModifiedAt: now,
      })),
      updatedAt: now,
    };

    await _saveAndBroadcast(updatedList);
    return { success: true, data: updatedList };
  } catch (error) {
    console.error("Error updating score:", error);
    return { error: "Failed to update score" };
  }
};

export const assignKanbanItem = async (formData: FormData) => {
  try {
    const { listId, itemId, assignee, category } = getFormData(formData, [
      "listId", "itemId", "assignee", "category",
    ]);

    const currentUser = await getCurrentUser();
    if (!currentUser) return { error: "Not authenticated" };

    const canEdit = await checkUserPermission(
      listId, category, ItemTypes.CHECKLIST, currentUser.username, PermissionTypes.EDIT
    );
    if (!canEdit) return { error: "Permission denied" };

    if (assignee) {
      const assigneeCanRead = await checkUserPermission(
        listId, category, ItemTypes.CHECKLIST, assignee, PermissionTypes.READ
      );
      if (!assigneeCanRead) return { error: "Assignee does not have access to this board" };
    }

    const list = await getListById(listId, undefined, category);
    if (!list) return { error: "List not found" };

    const now = new Date().toISOString();
    const updatedList: Checklist = {
      ...list,
      items: _updateItemInList(list.items, itemId, (item) => ({
        ...item,
        assignee: assignee || undefined,
        lastModifiedBy: currentUser.username,
        lastModifiedAt: now,
      })),
      updatedAt: now,
    };

    await _saveAndBroadcast(updatedList);
    return { success: true, data: updatedList };
  } catch (error) {
    console.error("Error assigning item:", error);
    return { error: "Failed to assign item" };
  }
};

export const setKanbanItemReminder = async (formData: FormData) => {
  try {
    const { listId, itemId, reminder: reminderStr, category } = getFormData(formData, [
      "listId", "itemId", "reminder", "category",
    ]);

    const currentUser = await getCurrentUser();
    if (!currentUser) return { error: "Not authenticated" };

    const canEdit = await checkUserPermission(
      listId, category, ItemTypes.CHECKLIST, currentUser.username, PermissionTypes.EDIT
    );
    if (!canEdit) return { error: "Permission denied" };

    const list = await getListById(listId, undefined, category);
    if (!list) return { error: "List not found" };

    let reminder: KanbanReminder | undefined;
    if (reminderStr) {
      try {
        reminder = JSON.parse(reminderStr);
      } catch {
        reminder = { datetime: reminderStr };
      }
    }

    const now = new Date().toISOString();
    const updatedList: Checklist = {
      ...list,
      items: _updateItemInList(list.items, itemId, (item) => ({
        ...item,
        reminder,
        lastModifiedBy: currentUser.username,
        lastModifiedAt: now,
      })),
      updatedAt: now,
    };

    await _saveAndBroadcast(updatedList);
    return { success: true, data: updatedList };
  } catch (error) {
    console.error("Error setting reminder:", error);
    return { error: "Failed to set reminder" };
  }
};

export const markReminderNotified = async (formData: FormData) => {
  try {
    const { listId, itemId, category } = getFormData(formData, [
      "listId", "itemId", "category",
    ]);

    const list = await getListById(listId, undefined, category);
    if (!list) return { error: "List not found" };

    const updatedList: Checklist = {
      ...list,
      items: _updateItemInList(list.items, itemId, (item) => ({
        ...item,
        reminder: item.reminder
          ? { ...item.reminder, notified: true }
          : undefined,
      })),
      updatedAt: new Date().toISOString(),
    };

    await _saveAndBroadcast(updatedList);
    return { success: true, data: updatedList };
  } catch (error) {
    console.error("Error marking reminder:", error);
    return { error: "Failed to mark reminder" };
  }
};
