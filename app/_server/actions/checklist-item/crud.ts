"use server";

import { revalidatePath } from "next/cache";
import path from "path";
import {
  serverWriteFile,
  ensureDir,
} from "@/app/_server/actions/file";
import {
  getListById,
} from "@/app/_server/actions/checklist";
import {
  listToMarkdown,
  areAllItemsCompleted,
} from "@/app/_utils/checklist-utils";
import {
  extractHashtagsFromContent,
  normalizeTag,
} from "@/app/_utils/tag-utils";
import { getUsername } from "@/app/_server/actions/users";
import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";
import { Checklist, Item, KanbanPriority, Result } from "@/app/_types";
import {
  ItemTypes,
  PermissionTypes,
  TaskStatus,
} from "@/app/_types/enums";
import { checkUserPermission } from "../sharing";
import { broadcast } from "@/app/_server/ws/broadcast";
import { updateAllChildren } from "@/app/_utils/item-tree-utils";
import { isKanbanType } from "@/app/_types/enums";

export const updateItem = async (
  checklist: Checklist,
  formData: FormData,
  username?: string,
  skipRevalidation = false,
): Promise<Result<Checklist>> => {
  try {
    const itemId = formData.get("itemId") as string;
    const text = formData.get("text") as string;
    const description = formData.get("description") as string;

    const currentUser = username || (await getUsername());

    const canEdit = await checkUserPermission(
      checklist.uuid,
      ItemTypes.CHECKLIST,
      currentUser,
      PermissionTypes.EDIT,
      checklist.owner,
    );

    if (!canEdit) {
      throw new Error("Permission denied");
    }

    const _updateParentBasedOnChildren = (parent: Item): Item => {
      if ((parent.children || []).length < 1) return parent;
      return { ...parent, completed: areAllItemsCompleted(parent.children!) };
    };

    const _findAndUpdateItem = (items: Item[], itemId: string, updates: Partial<Item>): Item[] =>
      items.map((item) => {
        if (item.id === itemId) {
          let updatedItem = { ...item, ...updates };
          if (updates.completed && item.children && item.children.length > 0) {
            updatedItem.children = updateAllChildren(item.children, true);
          } else if (updates.completed === false && item.children && item.children.length > 0) {
            updatedItem.children = updateAllChildren(item.children, false);
          }
          return updatedItem;
        }
        if (item.children && item.children.length > 0) {
          return _updateParentBasedOnChildren({
            ...item,
            children: _findAndUpdateItem(item.children, itemId, updates),
          });
        }
        return item;
      });

    const now = new Date().toISOString();
    const completedRaw = formData.get("completed");

    const textInlineTags = text ? extractHashtagsFromContent(text) : [];
    const existingTags = checklist.tags || [];
    const mergedTags = text
      ? Array.from(
          new Set([...existingTags.map(normalizeTag), ...textInlineTags]),
        ).filter(Boolean)
      : existingTags;

    const priority = formData.get("priority") as string | null;
    const score = formData.get("score") as string | null;
    const assignee = formData.get("assignee") as string | null;
    const reminder = formData.get("reminder") as string | null;
    const targetDate = formData.get("targetDate") as string | null;
    const estimatedTime = formData.get("estimatedTime") as string | null;

    const updatedList = {
      ...checklist,
      items: _findAndUpdateItem(checklist.items, itemId, {
        ...(completedRaw !== null && { completed: completedRaw === "true" }),
        ...(text && { text }),
        ...(description !== null &&
          description !== undefined && { description }),
        ...(priority !== null && { priority: (priority || undefined) as KanbanPriority | undefined }),
        ...(score !== null && { score: score ? parseInt(score) : undefined }),
        ...(assignee !== null && { assignee: assignee || undefined }),
        ...(reminder !== null && {
          reminder: reminder ? JSON.parse(reminder) : undefined,
        }),
        ...(targetDate !== null && { targetDate: targetDate || undefined }),
        ...(estimatedTime !== null && { estimatedTime: estimatedTime ? parseFloat(estimatedTime) : undefined }),
        lastModifiedBy: currentUser,
        lastModifiedAt: now,
      }),
      tags: mergedTags,
      updatedAt: now,
    };

    const ownerDir = path.join(
      process.cwd(),
      "data",
      CHECKLISTS_FOLDER,
      checklist.owner!,
    );
    const categoryDir = path.join(
      ownerDir,
      checklist.category || "Uncategorized",
    );
    await ensureDir(categoryDir);

    const filePath = path.join(categoryDir, `${checklist.slug}.md`);

    await serverWriteFile(filePath, listToMarkdown(updatedList));

    if (!skipRevalidation) {
      try {
        revalidatePath("/");
        revalidatePath(`/checklist/${checklist.owner}/${checklist.uuid}`);
      } catch (error) {
        console.warn(
          "Cache revalidation failed, but data was saved successfully:",
          error,
        );
      }
    }

    await broadcast({
      type: "checklist",
      action: "updated",
      entityId: checklist.uuid,
      username: currentUser,
    });

    return { success: true, data: updatedList as Checklist };
  } catch (error) {
    console.error(
      "Error updating item:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    console.error(
      "Error updating item:",
      error instanceof Error ? error.message : String(error),
    );
    return { success: false, error: "Failed to update item" };
  }
};

export const createItem = async (
  list: Checklist,
  formData: FormData,
  username?: string,
  skipRevalidation = false,
) => {
  try {
    const text = formData.get("text") as string;
    const status = formData.get("status") as string;
    const timeStr = formData.get("time") as string;
    const description = formData.get("description") as string;
    const currentUser = username || (await getUsername());
    const recurrenceStr = formData.get("recurrence") as string;

    const canEdit = await checkUserPermission(
      list.uuid,
      ItemTypes.CHECKLIST,
      currentUser,
      PermissionTypes.EDIT,
      list.owner,
    );

    if (!canEdit) {
      throw new Error("Permission denied");
    }

    let timeEntries: any[] = [];
    if (timeStr && timeStr !== "0") {
      try {
        timeEntries = JSON.parse(timeStr);
      } catch (e) {
        console.error("Failed to parse time entries:", e);
        timeEntries = [];
      }
    }

    const now = new Date().toISOString();

    let recurrence = undefined;
    if (recurrenceStr) {
      try {
        recurrence = JSON.parse(recurrenceStr);

        if (recurrence && !recurrence.nextDue) {
          const { calculateNextOccurrence } =
            await import("@/app/_utils/recurrence-utils");
          recurrence.nextDue = calculateNextOccurrence(
            recurrence.rrule,
            recurrence.dtstart,
          );
        }
      } catch (e) {
        console.error("Failed to parse recurrence:", e);
        recurrence = undefined;
      }
    }

    const getDefaultStatus = (): TaskStatus => {
      if (status) return status as TaskStatus;

      if (list.statuses && list.statuses.length > 0) {
        const sortedStatuses = [...list.statuses].sort(
          (a, b) => a.order - b.order,
        );
        return sortedStatuses[0].id as TaskStatus;
      }

      return TaskStatus.TODO;
    };

    const defaultStatus = isKanbanType(list.type)
      ? getDefaultStatus()
      : undefined;

    let isSharedBoard = false;
    if (isKanbanType(list.type)) {
      const { getUsersWithAccess } = await import("@/app/_server/actions/sharing");
      const sharedUsers = await getUsersWithAccess(list.uuid);
      isSharedBoard = sharedUsers.length > 0;
    }

    const shiftedItems = list.items.map((item) => ({
      ...item,
      order: item.order + 1,
    }));

    const newItem = {
      id: `${list.slug}-${Date.now()}`,
      text,
      completed: false,
      order: 0,
      description: description || undefined,
      createdBy: currentUser,
      createdAt: now,
      lastModifiedBy: currentUser,
      lastModifiedAt: now,
      ...(isKanbanType(list.type) &&
        defaultStatus && {
          status: defaultStatus,
          timeEntries,
          history: [
            {
              status: defaultStatus,
              timestamp: now,
              user: currentUser,
            },
          ],
        }),
      ...(isSharedBoard && { assignee: currentUser }),
      ...(recurrence && { recurrence }),
    };

    const inlineTags = extractHashtagsFromContent(text);
    const existingTags = list.tags || [];
    const mergedTags = Array.from(
      new Set([...existingTags.map(normalizeTag), ...inlineTags]),
    ).filter(Boolean);

    const updatedList = {
      ...list,
      items: [newItem, ...shiftedItems],
      tags: mergedTags,
      updatedAt: new Date().toISOString(),
    };

    const ownerDir = path.join(
      process.cwd(),
      "data",
      CHECKLISTS_FOLDER,
      list.owner!,
    );
    const categoryDir = path.join(ownerDir, list.category || "Uncategorized");

    await ensureDir(categoryDir);

    const filePath = path.join(categoryDir, `${list.slug}.md`);

    await serverWriteFile(filePath, listToMarkdown(updatedList as Checklist));

    if (!skipRevalidation) {
      try {
        revalidatePath("/");
        revalidatePath(`/checklist/${list.owner}/${list.uuid}`);
      } catch (error) {
        console.warn(
          "Cache revalidation failed, but data was saved successfully:",
          error,
        );
      }
    }

    await broadcast({
      type: "checklist",
      action: "updated",
      entityId: list.uuid,
      username: currentUser,
    });

    return { success: true, data: newItem };
  } catch (error) {
    console.error(
      "Error creating item:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    return { success: false, error: "Failed to create item" };
  }
};

export const deleteItem = async (
  formData: FormData,
): Promise<Result<Checklist>> => {
  try {
    const uuid = formData.get("uuid") as string;
    const itemId = formData.get("itemId") as string;

    if (!uuid) {
      throw new Error("UUID is required");
    }

    const currentUser = await getUsername();
    const list = await getListById(uuid, undefined, currentUser);

    if (!list) {
      throw new Error("List not found");
    }

    const canDelete = await checkUserPermission(
      list.uuid,
      ItemTypes.CHECKLIST,
      currentUser,
      PermissionTypes.DELETE,
      list.owner,
    );

    if (!canDelete) {
      throw new Error("Permission denied");
    }

    const findItemExists = (items: any[], itemId: string): boolean => {
      for (const item of items) {
        if (item.id === itemId) {
          return true;
        }
        if (item.children && findItemExists(item.children, itemId)) {
          return true;
        }
      }
      return false;
    };

    const filterOutItem = (items: any[], itemId: string): any[] => {
      return items
        .filter((item) => item.id !== itemId)
        .map((item) => {
          const children = item.children
            ? filterOutItem(item.children, itemId)
            : undefined;
          const completed =
            children && children.length > 0 && areAllItemsCompleted(children)
              ? true
              : item.completed;

          return { ...item, children, completed };
        })
        .filter((item) => item.children?.length > 0 || item.id !== undefined);
    };

    const itemExists = findItemExists(list.items || [], itemId);
    if (!itemExists) {
      return { success: true };
    }

    const updatedList = {
      ...list,
      items: filterOutItem(list.items || [], itemId),
      updatedAt: new Date().toISOString(),
    };

    const ownerDir = path.join(
      process.cwd(),
      "data",
      CHECKLISTS_FOLDER,
      list.owner!,
    );
    const filePath = path.join(
      ownerDir,
      list.category || "Uncategorized",
      `${list.slug}.md`,
    );

    await serverWriteFile(filePath, listToMarkdown(updatedList as Checklist));

    try {
      revalidatePath("/");
      revalidatePath(`/checklist/${list.owner}/${list.uuid}`);
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error,
      );
    }

    await broadcast({
      type: "checklist",
      action: "updated",
      entityId: list.uuid,
      username: currentUser,
    });

    return { success: true, data: updatedList as Checklist };
  } catch (error) {
    return { success: false, error: "Failed to delete item" };
  }
};
