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
import { listToMarkdown } from "@/app/_utils/checklist-utils";
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
      listId,
      category || "Uncategorized",
      ItemTypes.CHECKLIST,
      currentUser,
      PermissionTypes.EDIT
    );

    if (!canEdit) {
      throw new Error("Permission denied");
    }

    const areAllItemsCompleted = (items: any[]): boolean => {
      if (items.length === 0) return true;

      return items.every((item) => {
        if (item.children && item.children.length > 0) {
          return item.completed && areAllItemsCompleted(item.children);
        }
        return item.completed;
      });
    };

    const areAnyItemsCompleted = (items: any[]): boolean => {
      return items.some((item) => {
        if (item.children && item.children.length > 0) {
          return item.completed || areAnyItemsCompleted(item.children);
        }
        return item.completed;
      });
    };

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
      if (!parent || !parent.children || parent.children.length === 0) {
        return parent;
      }

      const allChildrenCompleted = areAllItemsCompleted(parent.children);
      const anyChildrenCompleted = areAnyItemsCompleted(parent.children);

      let updatedParent = { ...parent };

      if (allChildrenCompleted) {
        updatedParent.completed = true;
      } else if (!anyChildrenCompleted) {
        updatedParent.completed = false;
      }

      return updatedParent;
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
      listId,
      category || "Uncategorized",
      ItemTypes.CHECKLIST,
      username || "",
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

    const newItem = {
      id: `${listId}-${Date.now()}`,
      text,
      completed: false,
      order: list.items.length,
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
      items: [...list.items, newItem],
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
        .map((item) => ({
          ...item,
          children: item.children
            ? filterOutItem(item.children, itemId)
            : undefined,
        }))
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

    return { success: true, data: updatedList as Checklist };
  } catch (error) {
    return { success: false, error: "Failed to delete item" };
  }
};

export const reorderItems = async (formData: FormData) => {
  try {
    const listId = formData.get("listId") as string;
    const activeItemId = formData.get("activeItemId") as string;
    const overItemId = formData.get("overItemId") as string;
    const category = formData.get("category") as string;
    const isDropInto = formData.get("isDropInto") === "true";

    const isAdminUser = await isAdmin();
    const lists = await (isAdminUser ? getAllLists() : getUserChecklists());
    if (!lists.success || !lists.data) {
      throw new Error(lists.error || "Failed to fetch lists");
    }

    const list = lists.data.find(
      (l) => l.id === listId && (!category || l.category === category)
    );
    if (!list) {
      throw new Error("List not found");
    }

    const findItemWithParent = (
      items: any[],
      targetId: string,
      parent: any = null
    ): { item: any; parent: any; siblings: any[]; index: number } | null => {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.id === targetId) {
          return { item, parent, siblings: items, index: i };
        }
        if (item.children) {
          const found = findItemWithParent(item.children, targetId, item);
          if (found) return found;
        }
      }
      return null;
    };

    const cloneItems = (items: any[]): any[] => {
      return items.map((item) => ({
        ...item,
        children: item.children ? cloneItems(item.children) : undefined,
      }));
    };

    const isDescendantOf = (
      ancestorId: string,
      descendantId: string,
      items: any[]
    ): boolean => {
      const findItem = (items: any[], id: string): any | null => {
        for (const item of items) {
          if (item.id === id) return item;
          if (item.children) {
            const found = findItem(item.children, id);
            if (found) return found;
          }
        }
        return null;
      };

      const checkDescendant = (item: any, targetId: string): boolean => {
        if (!item.children) return false;
        for (const child of item.children) {
          if (child.id === targetId) return true;
          if (checkDescendant(child, targetId)) return true;
        }
        return false;
      };

      const ancestor = findItem(items, ancestorId);
      return ancestor ? checkDescendant(ancestor, descendantId) : false;
    };

    if (isDescendantOf(activeItemId, overItemId, list.items || [])) {
      return { success: true }; // Silently succeed but do nothing
    }

    const newItems = cloneItems(list.items || []);

    const activeInfo = findItemWithParent(newItems, activeItemId);
    const overInfo = findItemWithParent(newItems, overItemId);

    if (!activeInfo || !overInfo) {
      throw new Error("Item not found in hierarchy");
    }

    activeInfo.siblings.splice(activeInfo.index, 1);

    if (isDropInto) {
      if (!overInfo.item.children) {
        overInfo.item.children = [];
      }
      overInfo.item.children.push(activeInfo.item);
    } else {
      const targetSiblings = overInfo.siblings;
      let newIndex = targetSiblings.findIndex((item) => item.id === overItemId);
      targetSiblings.splice(newIndex, 0, activeInfo.item);
    }

    const updateOrder = (items: any[]) => {
      items.forEach((item, idx) => {
        item.order = idx;
        if (item.children) updateOrder(item.children);
      });
    };
    updateOrder(newItems);

    const updatedList = {
      ...list,
      items: newItems,
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

    const markdownContent = listToMarkdown(updatedList as Checklist);

    await serverWriteFile(filePath, markdownContent);

    try {
      revalidatePath("/");
      revalidatePath(`/checklist/${listId}`);
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to reorder items" };
  }
};

export const updateItemStatus = async (
  formData: FormData,
  usernameOverride?: string
): Promise<Result<Checklist>> => {
  try {
    const listId = formData.get("listId") as string;
    const itemId = formData.get("itemId") as string;
    const status = formData.get("status") as string;
    const timeEntriesStr = formData.get("timeEntries") as string;
    const category = formData.get("category") as string;
    const formDataUsername = formData.get("username") as string;

    const username =
      usernameOverride || formDataUsername || (await getUsername());

    if (!listId || !itemId) {
      return { success: false, error: "List ID and item ID are required" };
    }

    if (!status && !timeEntriesStr) {
      return {
        success: false,
        error: "Either status or timeEntries must be provided",
      };
    }

    const list = await getListById(listId, username, category);
    const canEdit = await checkUserPermission(
      listId,
      category,
      ItemTypes.CHECKLIST,
      username,
      PermissionTypes.EDIT
    );

    if (!canEdit) {
      return { success: false, error: "Permission denied" };
    }

    if (!list) {
      return { success: false, error: "List not found" };
    }

    const now = new Date().toISOString();

    const updateAllChildren = (
      items: any[],
      completed: boolean,
      username: string,
      now: string
    ): any[] => {
      return items.map((item) => ({
        ...item,
        completed,
        lastModifiedBy: username,
        lastModifiedAt: now,
        children: item.children
          ? updateAllChildren(item.children, completed, username, now)
          : undefined,
      }));
    };

    const findAndUpdateItemStatus = (items: any[], itemId: string): any[] => {
      return items.map((item) => {
        if (item.id === itemId) {
          const updates: any = {};
          if (status) {
            updates.status = status;
            updates.lastModifiedBy = username;
            updates.lastModifiedAt = now;

            const targetStatus = list.statuses?.find((s) => s.id === status);
            if (targetStatus?.autoComplete) {
              updates.completed = true;
              if (item.children && item.children.length > 0) {
                updates.children = updateAllChildren(
                  item.children,
                  true,
                  username,
                  now
                );
              }
            } else if (item.completed && status !== item.status) {
              updates.completed = false;
              if (item.children && item.children.length > 0) {
                updates.children = updateAllChildren(
                  item.children,
                  false,
                  username,
                  now
                );
              }
            }

            if (status !== item.status) {
              const history = item.history || [];
              history.push({
                status,
                timestamp: now,
                user: username,
              });
              updates.history = history;
            }
          }
          if (timeEntriesStr) {
            try {
              const timeEntries = JSON.parse(timeEntriesStr);
              updates.timeEntries = timeEntries.map((entry: any) => ({
                ...entry,
                user: entry.user || username,
              }));
            } catch (e) {
              console.error("Failed to parse timeEntries:", e);
            }
          }
          return { ...item, ...updates };
        }

        if (item.children && item.children.length > 0) {
          return {
            ...item,
            children: findAndUpdateItemStatus(item.children, itemId),
          };
        }

        return item;
      });
    };

    const updatedList = {
      ...list,
      items: findAndUpdateItemStatus(list.items, itemId),
      updatedAt: now,
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

    await serverWriteFile(filePath, listToMarkdown(updatedList));

    try {
      revalidatePath("/");
      revalidatePath(`/checklist/${listId}`);
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error
      );
    }
    return { success: true, data: updatedList as Checklist };
  } catch (error) {
    console.error("Error updating item status:", error);
    return { success: false, error: "Failed to update item status" };
  }
};

export const createBulkItems = async (
  formData: FormData
): Promise<Result<Checklist>> => {
  try {
    const listId = formData.get("listId") as string;
    const itemsText = formData.get("itemsText") as string;
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
    const now = new Date().toISOString();

    const lines = itemsText.split("\n").filter((line) => line.trim());
    const newItems = lines.map((text, index) => ({
      id: `${listId}-${Date.now()}-${index}`,
      text: text.trim(),
      completed: false,
      order: list?.items?.length || 0 + index,
      createdBy: currentUser,
      createdAt: now,
      lastModifiedBy: currentUser,
      lastModifiedAt: now,
      ...(list.type === "task" && {
        status: TaskStatus.TODO,
        timeEntries: [],
        history: [
          {
            status: TaskStatus.TODO,
            timestamp: now,
            user: currentUser,
          },
        ],
      }),
    }));

    const updatedList = {
      ...list,
      items: [...(list.items || []), ...newItems],
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
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error
      );
    }

    return { success: true, data: updatedList as Checklist };
  } catch (error) {
    return { success: false, error: "Failed to create bulk items" };
  }
};

export const bulkToggleItems = async (
  formData: FormData
): Promise<Result<Checklist>> => {
  try {
    const listId = formData.get("listId") as string;
    const completed = formData.get("completed") === "true";
    const itemIdsStr = formData.get("itemIds") as string;
    const completedStatesStr = formData.get("completedStates") as string;
    const category = formData.get("category") as string;
    let currentUser = formData.get("username") as string;

    if (!currentUser) {
      currentUser = await getUsername();
    }

    if (!listId || !itemIdsStr) {
      return { success: false, error: "List ID and item IDs are required" };
    }

    const itemIds = JSON.parse(itemIdsStr);
    const completedStates = completedStatesStr
      ? JSON.parse(completedStatesStr)
      : null;

    const list = await getListById(listId, currentUser, category);
    const canEdit = await checkUserPermission(
      listId,
      category,
      ItemTypes.CHECKLIST,
      currentUser,
      PermissionTypes.EDIT
    );

    if (!canEdit) {
      return { success: false, error: "Permission denied" };
    }

    if (!list) {
      return { success: false, error: "List not found" };
    }

    const now = new Date().toISOString();

    const areAllItemsCompleted = (items: any[]): boolean => {
      if (items.length === 0) return true;
      return items.every((item) => {
        if (item.children && item.children.length > 0) {
          return item.completed && areAllItemsCompleted(item.children);
        }
        return item.completed;
      });
    };

    const areAnyItemsCompleted = (items: any[]): boolean => {
      return items.some((item) => {
        if (item.children && item.children.length > 0) {
          return item.completed || areAnyItemsCompleted(item.children);
        }
        return item.completed;
      });
    };

    const updateAllChildren = (
      items: any[],
      completed: boolean,
      currentUser: string,
      now: string
    ): any[] => {
      return items.map((item) => ({
        ...item,
        completed,
        lastModifiedBy: currentUser,
        lastModifiedAt: now,
        children: item.children
          ? updateAllChildren(item.children, completed, currentUser, now)
          : undefined,
      }));
    };

    const updateParentBasedOnChildren = (parent: any): any => {
      if (!parent || !parent.children || parent.children.length === 0) {
        return parent;
      }

      const allChildrenCompleted = areAllItemsCompleted(parent.children);
      const anyChildrenCompleted = areAnyItemsCompleted(parent.children);

      let updatedParent = { ...parent };

      if (allChildrenCompleted) {
        updatedParent.completed = true;
      } else if (!anyChildrenCompleted) {
        updatedParent.completed = false;
      }

      return updatedParent;
    };

    const bulkUpdateItems = (
      items: any[],
      itemIds: string[],
      completedStates: boolean[] | null,
      currentUser: string,
      now: string
    ): any[] => {
      return items.map((item) => {
        let updatedItem = { ...item };

        const itemIndex = itemIds.indexOf(item.id);
        if (itemIndex !== -1) {
          const itemCompleted = completedStates
            ? completedStates[itemIndex]
            : completed;
          updatedItem.completed = itemCompleted;
          updatedItem.lastModifiedBy = currentUser;
          updatedItem.lastModifiedAt = now;

          if (itemCompleted && item.children && item.children.length > 0) {
            updatedItem.children = updateAllChildren(
              item.children,
              true,
              currentUser,
              now
            );
          } else if (
            !itemCompleted &&
            item.children &&
            item.children.length > 0
          ) {
            updatedItem.children = updateAllChildren(
              item.children,
              false,
              currentUser,
              now
            );
          }
        }

        if (item.children && item.children.length > 0) {
          updatedItem.children = bulkUpdateItems(
            item.children,
            itemIds,
            completedStates,
            currentUser,
            now
          );
          updatedItem = updateParentBasedOnChildren(updatedItem);
        }

        return updatedItem;
      });
    };

    const updatedList = {
      ...list,
      items: bulkUpdateItems(
        list.items,
        itemIds,
        completedStates,
        currentUser,
        now
      ),
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

    await serverWriteFile(filePath, listToMarkdown(updatedList));

    try {
      revalidatePath("/");
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error
      );
    }
    return { success: true, data: updatedList as Checklist };
  } catch (error) {
    console.error("Error bulk toggling items:", error);
    return { success: false, error: "Failed to bulk toggle items" };
  }
};

export const bulkDeleteItems = async (
  formData: FormData
): Promise<Result<Checklist>> => {
  try {
    const listId = formData.get("listId") as string;
    const itemIdsStr = formData.get("itemIds") as string;
    const itemIdsToDelete = JSON.parse(itemIdsStr) as string[];
    const category = formData.get("category") as string;
    let currentUser = formData.get("username") as string;

    if (!currentUser) {
      currentUser = await getUsername();
    }

    if (!listId || !itemIdsToDelete || itemIdsToDelete.length === 0) {
      return { success: true };
    }

    const list = await getListById(listId, currentUser, category);
    const canEdit = await checkUserPermission(
      listId,
      category,
      ItemTypes.CHECKLIST,
      currentUser,
      PermissionTypes.EDIT
    );

    if (!canEdit) {
      return { success: false, error: "Permission denied" };
    }

    if (!list) {
      return { success: false, error: "List not found" };
    }

    const itemIdsSet = new Set(itemIdsToDelete);

    const filterOutItems = (items: any[], itemIds: Set<string>): any[] => {
      return items
        .filter((item) => !itemIds.has(item.id))
        .map((item) => ({
          ...item,
          children: item.children
            ? filterOutItems(item.children, itemIds)
            : undefined,
        }))
        .filter((item) => item.children?.length > 0 || item.id !== undefined);
    };

    const updatedList = {
      ...list,
      items: filterOutItems(list.items, itemIdsSet),
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

    await serverWriteFile(filePath, listToMarkdown(updatedList));

    try {
      revalidatePath("/");
      revalidatePath(`/checklist/${listId}`);
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error
      );
    }

    return { success: true };
  } catch (error) {
    console.error("Error during bulk delete:", error);
    return { success: false, error: "Failed to bulk delete items" };
  }
};

export const createSubItem = async (
  formData: FormData
): Promise<Result<Checklist>> => {
  try {
    const listId = formData.get("listId") as string;
    const parentId = formData.get("parentId") as string;
    const text = formData.get("text") as string;
    const category = formData.get("category") as string;

    const isAdminUser = await isAdmin();
    const lists = await (isAdminUser ? getAllLists() : getUserChecklists());
    if (!lists.success || !lists.data) {
      throw new Error(lists.error || "Failed to fetch lists");
    }

    const list = lists.data.find(
      (l) => l.id === listId && (!category || l.category === category)
    );
    if (!list) {
      throw new Error("List not found");
    }

    const addSubItemToParent = (
      items: any[],
      parentId: string,
      newSubItem: any
    ): boolean => {
      for (let item of items) {
        if (item.id === parentId) {
          if (!item.children) {
            item.children = [];
          }
          item.children.push(newSubItem);
          return true;
        }

        if (
          item.children &&
          addSubItemToParent(item.children, parentId, newSubItem)
        ) {
          return true;
        }
      }
      return false;
    };

    const currentUser = await getUsername();
    const now = new Date().toISOString();

    const newSubItem: any = {
      id: `${listId}-sub-${Date.now()}`,
      text,
      completed: false,
      order: 0,
      createdBy: currentUser,
      createdAt: now,
      lastModifiedBy: currentUser,
      lastModifiedAt: now,
    };

    if (list.type === "task") {
      newSubItem.status = TaskStatus.TODO;
      newSubItem.timeEntries = [];
      newSubItem.history = [
        {
          status: TaskStatus.TODO,
          timestamp: now,
          user: currentUser,
        },
      ];
    }

    if (!addSubItemToParent(list.items || [], parentId, newSubItem)) {
      throw new Error("Parent item not found");
    }

    const updateChildrenOrder = (items: any[]) => {
      items.forEach((item, index) => {
        item.order = index;
        if (item.children) {
          updateChildrenOrder(item.children);
        }
      });
    };

    updateChildrenOrder(list.items || []);

    const updatedList = {
      ...list,
      items: list.items || [],
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

    try {
      revalidatePath("/");
      revalidatePath(`/checklist/${listId}`);
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error
      );
    }

    return { success: true, data: updatedList as Checklist };
  } catch (error) {
    console.error("Error creating sub-item:", error);
    return { success: false, error: "Failed to create sub-item" };
  }
};

export const archiveItem = async (
  formData: FormData
): Promise<Result<Checklist>> => {
  try {
    const listId = formData.get("listId") as string;
    const itemId = formData.get("itemId") as string;
    const category = formData.get("category") as string;

    const currentUser = await getUsername();

    if (!listId || !itemId) {
      return { success: false, error: "List ID and item ID are required" };
    }

    const list = await getListById(listId, currentUser, category);
    const canEdit = await checkUserPermission(
      listId,
      category,
      ItemTypes.CHECKLIST,
      currentUser,
      PermissionTypes.EDIT
    );

    if (!canEdit) {
      return { success: false, error: "Permission denied" };
    }

    if (!list) {
      return { success: false, error: "List not found" };
    }

    const now = new Date().toISOString();

    const archiveItemRecursive = (items: any[]): any[] => {
      return items.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            isArchived: true,
            archivedAt: now,
            archivedBy: currentUser,
            previousStatus: item.status,
          };
        }
        if (item.children && item.children.length > 0) {
          return {
            ...item,
            children: archiveItemRecursive(item.children),
          };
        }
        return item;
      });
    };

    const updatedList = {
      ...list,
      items: archiveItemRecursive(list.items),
      updatedAt: now,
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

    await serverWriteFile(filePath, listToMarkdown(updatedList));

    try {
      revalidatePath("/");
      revalidatePath(`/checklist/${listId}`);
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error
      );
    }

    return { success: true, data: updatedList as Checklist };
  } catch (error) {
    console.error("Error archiving item:", error);
    return { success: false, error: "Failed to archive item" };
  }
};

export const unarchiveItem = async (
  formData: FormData
): Promise<Result<Checklist>> => {
  try {
    const listId = formData.get("listId") as string;
    const itemId = formData.get("itemId") as string;
    const category = formData.get("category") as string;

    const currentUser = await getUsername();

    if (!listId || !itemId) {
      return { success: false, error: "List ID and item ID are required" };
    }

    const list = await getListById(listId, currentUser, category);
    const canEdit = await checkUserPermission(
      listId,
      category,
      ItemTypes.CHECKLIST,
      currentUser,
      PermissionTypes.EDIT
    );

    if (!canEdit) {
      return { success: false, error: "Permission denied" };
    }

    if (!list) {
      return { success: false, error: "List not found" };
    }

    const now = new Date().toISOString();

    const unarchiveItemRecursive = (items: any[]): any[] => {
      return items.map((item) => {
        if (item.id === itemId) {
          const {
            isArchived,
            archivedAt,
            archivedBy,
            previousStatus,
            ...rest
          } = item;
          return {
            ...rest,
            status: previousStatus || item.status,
          };
        }
        if (item.children && item.children.length > 0) {
          return {
            ...item,
            children: unarchiveItemRecursive(item.children),
          };
        }
        return item;
      });
    };

    const updatedList = {
      ...list,
      items: unarchiveItemRecursive(list.items),
      updatedAt: now,
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

    await serverWriteFile(filePath, listToMarkdown(updatedList));

    try {
      revalidatePath("/");
      revalidatePath(`/checklist/${listId}`);
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error
      );
    }

    return { success: true, data: updatedList as Checklist };
  } catch (error) {
    console.error("Error unarchiving item:", error);
    return { success: false, error: "Failed to unarchive item" };
  }
};
