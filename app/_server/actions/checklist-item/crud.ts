"use server";

import { revalidatePath } from "next/cache";
import path from "path";
import {
  getUserModeDir,
  serverWriteFile,
  ensureDir,
} from "@/app/_server/actions/file";
import {
  getAllLists,
  getUserChecklists,
  getListById,
} from "@/app/_server/actions/checklist";
import {
  listToMarkdown,
  areAllItemsCompleted
} from "@/app/_utils/checklist-utils";
import { isAdmin, getUsername } from "@/app/_server/actions/users";
import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";
import { Checklist, Result } from "@/app/_types";
import {
  ItemTypes,
  Modes,
  PermissionTypes,
  TaskStatus,
} from "@/app/_types/enums";
import { checkUserPermission } from "../sharing";
import { broadcast } from "@/app/_server/ws/broadcast";

export const updateItem = async (
  checklist: Checklist,
  formData: FormData,
  username?: string,
  skipRevalidation = false
): Promise<Result<Checklist>> => {
  try {
    const listId = formData.get("listId") as string;
    const itemId = formData.get("itemId") as string;
    const completed = formData.get("completed") === "true";
    const text = formData.get("text") as string;
    const description = formData.get("description") as string;
    const category = formData.get("category") as string;

    const currentUser = username || (await getUsername());

    const canEdit = await checkUserPermission(
      checklist.uuid || listId,
      category || "Uncategorized",
      ItemTypes.CHECKLIST,
      currentUser,
      PermissionTypes.EDIT
    );

    if (!canEdit) {
      throw new Error("Permission denied");
    }

    const updateAllChildren = (items: any[], completed: boolean): any[] => {
      return items.map((item) => ({
        ...item,
        completed,
        children: item.children
          ? updateAllChildren(item.children, completed)
          : undefined,
      }));
    };

    const updateParentBasedOnChildren = (parent: any): any => {
      if (!parent || (parent.children || []).length < 1) {
        return parent;
      }

      return {
        ...parent,
        completed: areAllItemsCompleted(parent.children)
      };
    };

    const findAndUpdateItem = (
      items: any[],
      itemId: string,
      updates: any
    ): any[] => {
      return items.map((item) => {
        if (item.id === itemId) {
          let updatedItem = { ...item, ...updates };

          if (updates.completed && item.children && item.children.length > 0) {
            updatedItem.children = updateAllChildren(item.children, true);
          } else if (
            updates.completed === false &&
            item.children &&
            item.children.length > 0
          ) {
            updatedItem.children = updateAllChildren(item.children, false);
          }

          return updatedItem;
        }

        if (item.children && item.children.length > 0) {
          const updatedChildren = findAndUpdateItem(
            item.children,
            itemId,
            updates
          );
          const updatedItem = updateParentBasedOnChildren({
            ...item,
            children: updatedChildren,
          });
          return updatedItem;
        }

        return item;
      });
    };

    const now = new Date().toISOString();

    const updatedList = {
      ...checklist,
      items: findAndUpdateItem(checklist.items, itemId, {
        completed,
        ...(text && { text }),
        ...(description !== null &&
          description !== undefined && { description }),
        lastModifiedBy: currentUser,
        lastModifiedAt: now,
      }),
      updatedAt: now,
    };

    const ownerDir = path.join(
      process.cwd(),
      "data",
      CHECKLISTS_FOLDER,
      checklist.owner!
    );
    const categoryDir = path.join(
      ownerDir,
      checklist.category || "Uncategorized"
    );
    await ensureDir(categoryDir);

    const filePath = path.join(categoryDir, `${listId}.md`);

    await serverWriteFile(filePath, listToMarkdown(updatedList));

    if (!skipRevalidation) {
      try {
        revalidatePath("/");
        revalidatePath(`/checklist/${listId}`);
      } catch (error) {
        console.warn(
          "Cache revalidation failed, but data was saved successfully:",
          error
        );
      }
    }

    await broadcast({ type: "checklist", action: "updated", entityId: listId, username: currentUser });

    return { success: true, data: updatedList as Checklist };
  } catch (error) {
    console.error(
      "Error updating item:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    console.error(
      "Error updating item:",
      error instanceof Error ? error.message : String(error)
    );
    return { success: false, error: "Failed to update item" };
  }
};

export const createItem = async (
  list: Checklist,
  formData: FormData,
  username?: string,
  skipRevalidation = false
) => {
  try {
    const listId = formData.get("listId") as string;
    const text = formData.get("text") as string;
    const status = formData.get("status") as string;
    const timeStr = formData.get("time") as string;
    const category = formData.get("category") as string;
    const description = formData.get("description") as string;
    const currentUser = username || (await getUsername());
    const recurrenceStr = formData.get("recurrence") as string;

    const canEdit = await checkUserPermission(
      list.uuid || listId,
      category || "Uncategorized",
      ItemTypes.CHECKLIST,
      currentUser,
      PermissionTypes.EDIT
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
          const { calculateNextOccurrence } = await import(
            "@/app/_utils/recurrence-utils"
          );
          recurrence.nextDue = calculateNextOccurrence(
            recurrence.rrule,
            recurrence.dtstart
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
          (a, b) => a.order - b.order
        );
        return sortedStatuses[0].id as TaskStatus;
      }

      return TaskStatus.TODO;
    };

    const defaultStatus = list.type === "task" ? getDefaultStatus() : undefined;

    const shiftedItems = list.items.map((item) => ({
      ...item,
      order: item.order + 1,
    }));

    const newItem = {
      id: `${listId}-${Date.now()}`,
      text,
      completed: false,
      order: 0,
      description: description || undefined,
      createdBy: currentUser,
      createdAt: now,
      lastModifiedBy: currentUser,
      lastModifiedAt: now,
      ...(list.type === "task" &&
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
      ...(recurrence && { recurrence }),
    };

    const updatedList = {
      ...list,
      items: [newItem, ...shiftedItems],
      updatedAt: new Date().toISOString(),
    };

    const ownerDir = path.join(
      process.cwd(),
      "data",
      CHECKLISTS_FOLDER,
      list.owner!
    );
    const categoryDir = path.join(ownerDir, list.category || "Uncategorized");

    await ensureDir(categoryDir);

    const filePath = path.join(categoryDir, `${listId}.md`);

    await serverWriteFile(filePath, listToMarkdown(updatedList as Checklist));

    if (!skipRevalidation) {
      try {
        revalidatePath("/");
        revalidatePath(`/checklist/${listId}`);
      } catch (error) {
        console.warn(
          "Cache revalidation failed, but data was saved successfully:",
          error
        );
      }
    }

    await broadcast({ type: "checklist", action: "updated", entityId: listId, username: currentUser });

    return { success: true, data: newItem };
  } catch (error) {
    console.error(
      "Error creating item:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    return { success: false, error: "Failed to create item" };
  }
};

export const deleteItem = async (
  formData: FormData
): Promise<Result<Checklist>> => {
  try {
    const listId = formData.get("listId") as string;
    const itemId = formData.get("itemId") as string;
    const category = formData.get("category") as string;

    const lists = await getUserChecklists();
    if (!lists.success || !lists.data) {
      throw new Error(lists.error || "Failed to fetch lists");
    }

    const list = lists.data.find(
      (l) => l.id === listId && (!category || l.category === category)
    );
    if (!list) {
      throw new Error("List not found");
    }

    const currentUser = await getUsername();
    const canDelete = await checkUserPermission(
      list.uuid || listId,
      category || "Uncategorized",
      ItemTypes.CHECKLIST,
      currentUser,
      PermissionTypes.DELETE
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
          const completed = (
            children && children.length > 0 && areAllItemsCompleted(children)
          ) ? true : item.completed;

          return {...item, children, completed};
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

    let filePath: string;

    if (list.isShared) {
      const ownerDir = path.join(
        process.cwd(),
        "data",
        CHECKLISTS_FOLDER,
        list.owner!
      );
      filePath = path.join(
        ownerDir,
        list.category || "Uncategorized",
        `${listId}.md`
      );
    } else {
      const userDir = await getUserModeDir(Modes.CHECKLISTS);
      filePath = path.join(
        userDir,
        list.category || "Uncategorized",
        `${listId}.md`
      );
    }

    await serverWriteFile(filePath, listToMarkdown(updatedList as Checklist));

    try {
      revalidatePath("/");
      revalidatePath(`/checklist/${listId}`);
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error
      );
    }

    await broadcast({ type: "checklist", action: "updated", entityId: listId, username: currentUser });

    return { success: true, data: updatedList as Checklist };
  } catch (error) {
    return { success: false, error: "Failed to delete item" };
  }
};
