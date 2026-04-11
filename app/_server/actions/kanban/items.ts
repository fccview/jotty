"use server";

import path from "path";
import { Checklist, KanbanPriority, KanbanReminder } from "@/app/_types";
import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";
import { ItemTypes, PermissionTypes } from "@/app/_types/enums";
import { getCurrentUser } from "@/app/_server/actions/users";
import { serverWriteFile } from "@/app/_server/actions/file";
import { revalidatePath } from "next/cache";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { getFormData } from "@/app/_utils/global-utils";
import { checkUserPermission } from "@/app/_server/actions/sharing";
import { broadcast } from "@/app/_server/ws/broadcast";
import { getListById } from "@/app/_server/actions/checklist";
import { createNotificationForUser } from "@/app/_server/actions/notifications";
import { findItem, updateItem } from "@/app/_utils/item-tree-utils";

const _getFilePath = (list: Checklist): string => {
  const categoryDir = list.category || "Uncategorized";
  const filename = `${list.slug}.md`;

  return path.join(
    process.cwd(), "data", CHECKLISTS_FOLDER, list.owner!, categoryDir, filename
  );
};

async function _saveAndBroadcast(list: Checklist, username: string) {
  const filePath = _getFilePath(list);
  await serverWriteFile(filePath, listToMarkdown(list));

  await broadcast({
    type: "checklist",
    action: "updated",
    entityId: list.uuid,
    username,
  });

  try {
    revalidatePath("/");
  } catch { }
}

export const updateKanbanItemPriority = async (formData: FormData) => {
  try {
    const { uuid, itemId, priority } = getFormData(formData, [
      "uuid", "itemId", "priority",
    ]);

    const [currentUser, list] = await Promise.all([
      getCurrentUser(),
      getListById(uuid),
    ]);
    if (!currentUser) return { error: "Not authenticated" };
    if (!list) return { error: "List not found" };

    const canEdit = await checkUserPermission(
      list.uuid, ItemTypes.CHECKLIST, currentUser.username, PermissionTypes.EDIT, list.owner
    );
    if (!canEdit) return { error: "Permission denied" };

    const now = new Date().toISOString();
    const updatedList: Checklist = {
      ...list,
      items: updateItem(list.items, itemId, (item) => ({
        ...item,
        priority: priority as KanbanPriority,
        lastModifiedBy: currentUser.username,
        lastModifiedAt: now,
      })),
      updatedAt: now,
    };

    await _saveAndBroadcast(updatedList, currentUser.username);
    return { success: true, data: updatedList };
  } catch (error) {
    console.error("Error updating priority:", error);
    return { error: "Failed to update priority" };
  }
};

export const updateKanbanItemScore = async (formData: FormData) => {
  try {
    const { uuid, itemId, score } = getFormData(formData, [
      "uuid", "itemId", "score",
    ]);

    const [currentUser, list] = await Promise.all([
      getCurrentUser(),
      getListById(uuid),
    ]);
    if (!currentUser) return { error: "Not authenticated" };
    if (!list) return { error: "List not found" };

    const canEdit = await checkUserPermission(
      list.uuid, ItemTypes.CHECKLIST, currentUser.username, PermissionTypes.EDIT, list.owner
    );
    if (!canEdit) return { error: "Permission denied" };

    const now = new Date().toISOString();
    const updatedList: Checklist = {
      ...list,
      items: updateItem(list.items, itemId, (item) => ({
        ...item,
        score: parseInt(score),
        lastModifiedBy: currentUser.username,
        lastModifiedAt: now,
      })),
      updatedAt: now,
    };

    await _saveAndBroadcast(updatedList, currentUser.username);
    return { success: true, data: updatedList };
  } catch (error) {
    console.error("Error updating score:", error);
    return { error: "Failed to update score" };
  }
};

export const assignKanbanItem = async (formData: FormData) => {
  try {
    const { uuid, itemId, assignee } = getFormData(formData, [
      "uuid", "itemId", "assignee",
    ]);

    const [currentUser, list] = await Promise.all([
      getCurrentUser(),
      getListById(uuid),
    ]);
    if (!currentUser) return { error: "Not authenticated" };
    if (!list) return { error: "List not found" };

    const canEdit = await checkUserPermission(
      list.uuid, ItemTypes.CHECKLIST, currentUser.username, PermissionTypes.EDIT, list.owner
    );
    if (!canEdit) return { error: "Permission denied" };

    const now = new Date().toISOString();
    const updatedList: Checklist = {
      ...list,
      items: updateItem(list.items, itemId, (item) => ({
        ...item,
        assignee: assignee || undefined,
        lastModifiedBy: currentUser.username,
        lastModifiedAt: now,
      })),
      updatedAt: now,
    };

    await _saveAndBroadcast(updatedList, currentUser.username);

    if (assignee && assignee !== currentUser.username) {
      const assignedItem = findItem(updatedList.items, itemId);
      await createNotificationForUser(assignee, {
        type: "assignment",
        title: assignedItem?.text || "New task assigned",
        message: `${currentUser.username} assigned you to a task in "${updatedList.title}"`,
        data: { itemId: updatedList.uuid, itemType: "checklist", taskId: itemId },
      });
    }

    return { success: true, data: updatedList };
  } catch (error) {
    console.error("Error assigning item:", error);
    return { error: "Failed to assign item" };
  }
};

export const setKanbanItemReminder = async (formData: FormData) => {
  try {
    const { uuid, itemId, reminder: reminderStr } = getFormData(formData, [
      "uuid", "itemId", "reminder",
    ]);

    const [currentUser, list] = await Promise.all([
      getCurrentUser(),
      getListById(uuid),
    ]);
    if (!currentUser) return { error: "Not authenticated" };
    if (!list) return { error: "List not found" };

    const canEdit = await checkUserPermission(
      list.uuid, ItemTypes.CHECKLIST, currentUser.username, PermissionTypes.EDIT, list.owner
    );
    if (!canEdit) return { error: "Permission denied" };

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
      items: updateItem(list.items, itemId, (item) => ({
        ...item,
        reminder,
        lastModifiedBy: currentUser.username,
        lastModifiedAt: now,
      })),
      updatedAt: now,
    };

    await _saveAndBroadcast(updatedList, currentUser.username);
    return { success: true, data: updatedList };
  } catch (error) {
    console.error("Error setting reminder:", error);
    return { error: "Failed to set reminder" };
  }
};

export const markReminderNotified = async (formData: FormData) => {
  try {
    const { uuid, itemId } = getFormData(formData, [
      "uuid", "itemId",
    ]);

    const list = await getListById(uuid);
    if (!list) return { error: "List not found" };

    const updatedList: Checklist = {
      ...list,
      items: updateItem(list.items, itemId, (item) => ({
        ...item,
        reminder: item.reminder
          ? { ...item.reminder, notified: true }
          : undefined,
      })),
      updatedAt: new Date().toISOString(),
    };

    await _saveAndBroadcast(updatedList, list.owner || "");
    return { success: true, data: updatedList };
  } catch (error) {
    console.error("Error marking reminder:", error);
    return { error: "Failed to mark reminder" };
  }
};
