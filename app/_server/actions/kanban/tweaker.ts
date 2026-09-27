import { revalidatePath } from "next/cache";
import { Checklist, Item, Result, KanbanReminder, SanitisedUser } from "@/app/_types";
import {
  ItemTypes,
  Modes,
  NotificationTargets,
  PermissionTypes,
} from "@/app/_types/enums";
import { serverWriteFile } from "@/app/_server/actions/file";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { reachableFile } from "@/app/_server/actions/share/queries";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { getListById } from "@/app/_server/actions/checklist/queries";
import { notifyUser } from "@/app/_server/actions/notifications/internal";
import { findItem, updateItem } from "@/app/_utils/item-tree-utils";
import { itemLane, runQueued } from "@/app/_server/actions/lib/concurrency";

const _tweakItem = async (
  actor: SanitisedUser,
  uuid: string,
  itemId: string,
  patch: Partial<Item>,
): Promise<Result<Checklist>> => {
  const username = actor?.username;
  if (!username) return { success: false, error: "Not authenticated" };

  const filePath = await reachableFile(
    uuid, ItemTypes.CHECKLIST, username, PermissionTypes.EDIT
  );
  if (!filePath) return { success: false, error: "Permission denied" };

  const list = await getListById(uuid, username);
  if (!list) return { success: false, error: "List not found" };

  const now = new Date().toISOString();
  const updatedList: Checklist = {
    ...list,
    items: updateItem(list.items, itemId, (item) => ({
      ...item,
      ...patch,
      lastModifiedBy: username,
      lastModifiedAt: now,
    })),
    updatedAt: now,
  };

  await serverWriteFile(filePath, listToMarkdown(updatedList));

  await broadcast({
    type: "checklist",
    action: "updated",
    entityId: updatedList.uuid,
    username,
  });

  try {
    revalidatePath("/");
  } catch (error) {
    console.warn("Cache revalidation failed, but data was saved successfully:", error);
  }

  return { success: true, data: updatedList };
};

export const tweakItem = async (
  actor: SanitisedUser,
  uuid: string,
  itemId: string,
  patch: Partial<Item>,
): Promise<Result<Checklist>> =>
  runQueued(itemLane(Modes.CHECKLISTS, uuid), () =>
    _tweakItem(actor, uuid, itemId, patch),
  );

export const assignItem = async (
  actor: SanitisedUser,
  uuid: string,
  itemId: string,
  assignee: string,
): Promise<Result<Checklist>> => {
  try {
    const result = await tweakItem(actor, uuid, itemId, {
      assignee: assignee || undefined,
    });

    if (!result.data || !assignee || assignee === actor.username) {
      return result;
    }

    const assignedItem = findItem(result.data.items, itemId);

    try {
      await notifyUser(assignee, {
        type: "assignment",
        title: assignedItem?.text || "New task assigned",
        message: `${actor.username} assigned you to a task in "${result.data.title}"`,
        data: {
          itemId: result.data.uuid,
          itemType: NotificationTargets.CHECKLIST,
          taskId: itemId,
        },
      });
    } catch (error) {
      console.warn("[kanban] assignment notification failed:", error);
    }

    return result;
  } catch (error) {
    console.error("Error assigning item:", error);
    return { success: false, error: "Failed to assign item" };
  }
};

const _parseReminder = (raw: string): KanbanReminder | undefined => {
  if (!raw) return undefined;

  try {
    return JSON.parse(raw);
  } catch {
    return { datetime: raw };
  }
};

export const remindItem = async (
  actor: SanitisedUser,
  uuid: string,
  itemId: string,
  reminder: string,
): Promise<Result<Checklist>> => {
  try {
    return await tweakItem(actor, uuid, itemId, {
      reminder: _parseReminder(reminder),
    });
  } catch (error) {
    console.error("Error setting reminder:", error);
    return { success: false, error: "Failed to set reminder" };
  }
};
