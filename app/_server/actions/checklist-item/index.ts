"use server";

import { revalidatePath } from "next/cache";
import path from "path";
import {
  getUserModeDir,
  serverWriteFile,
  ensureDir,
} from "@/app/_server/actions/file";
import {
  getLists,
  getAllLists,
  getRawLists,
  getListById,
} from "@/app/_server/actions/checklist";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { isAdmin, getUsername } from "@/app/_server/actions/users";
import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";
import { Checklist } from "@/app/_types";
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
) => {
  try {
    const listId = formData.get("listId") as string;
    const itemId = formData.get("itemId") as string;
    const completed = formData.get("completed") === "true";
    const text = formData.get("text") as string;
    const description = formData.get("description") as string;
    const category = formData.get("category") as string;

    const currentUser = username || (await getUsername());

    console.log("updateItem - currentUser", currentUser);
    console.log("updateItem - listId", listId);
    console.log("updateItem - category", category);
    console.log("updateItem - itemId", itemId);
    console.log("updateItem - completed", completed);
    console.log("updateItem - text", text);
    console.log("updateItem - description", description);

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

    return { success: true, data: updatedList };
  } catch (error) {
    console.error(
      "Error updating item:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    console.error(
      "Error updating item:",
      error instanceof Error ? error.message : String(error)
    );
    return { error: "Failed to update item" };
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
      ...(list.type === "task" && {
        status: (status as TaskStatus) || TaskStatus.TODO,
        timeEntries,
        history: [
          {
            status: (status as TaskStatus) || TaskStatus.TODO,
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
    return { error: "Failed to create item" };
  }
};

export const deleteItem = async (formData: FormData) => {
  try {
    const listId = formData.get("listId") as string;
    const itemId = formData.get("itemId") as string;
    const category = formData.get("category") as string;

    const lists = await getLists();
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

    const itemExists = findItemExists(list.items, itemId);
    if (!itemExists) {
      return { success: true };
    }

    const updatedList = {
      ...list,
      items: filterOutItem(list.items, itemId),
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

    return { success: true, data: updatedList };
  } catch (error) {
    return { error: "Failed to delete item" };
  }
};

export const reorderItems = async (formData: FormData) => {
  try {
    const listId = formData.get("listId") as string;
    const itemIds = JSON.parse(formData.get("itemIds") as string) as string[];
    const currentItems = JSON.parse(
      formData.get("currentItems") as string
    ) as any[];
    const category = formData.get("category") as string;

    const isAdminUser = await isAdmin();
    const lists = await (isAdminUser ? getAllLists() : getLists());
    if (!lists.success || !lists.data) {
      throw new Error(lists.error || "Failed to fetch lists");
    }

    const list = lists.data.find(
      (l) => l.id === listId && (!category || l.category === category)
    );
    if (!list) {
      throw new Error("List not found");
    }

    const itemMap = new Map(currentItems.map((item) => [item.id, item]));

    const updatedItems = itemIds.map((id, index) => {
      const item = itemMap.get(id);
      if (!item) throw new Error(`Item ${id} not found`);
      return { ...item, order: index };
    });

    const updatedList = {
      ...list,
      items: updatedItems,
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

    const markdownContent = listToMarkdown(updatedList);

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
    return { error: "Failed to reorder items" };
  }
};

export const updateItemStatus = async (formData: FormData) => {
  try {
    const listId = formData.get("listId") as string;
    const itemId = formData.get("itemId") as string;
    const status = formData.get("status") as TaskStatus;
    const timeEntriesStr = formData.get("timeEntries") as string;
    const category = formData.get("category") as string;

    const username = await getUsername();

    if (!listId || !itemId) {
      return { error: "List ID and item ID are required" };
    }

    if (!status && !timeEntriesStr) {
      return { error: "Either status or timeEntries must be provided" };
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
      return { error: "Permission denied" };
    }

    if (!list) {
      return { error: "List not found" };
    }

    const now = new Date().toISOString();
    const updatedList = {
      ...list,
      items: list.items.map((item) => {
        if (item.id === itemId) {
          const updates: any = {};
          if (status) {
            updates.status = status;
            updates.lastModifiedBy = username;
            updates.lastModifiedAt = now;

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
        return item;
      }),
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
    return { success: true, data: updatedList };
  } catch (error) {
    console.error("Error updating item status:", error);
    return { error: "Failed to update item status" };
  }
};

export const createBulkItems = async (formData: FormData) => {
  try {
    const listId = formData.get("listId") as string;
    const itemsText = formData.get("itemsText") as string;
    const category = formData.get("category") as string;

    const lists = await getLists();
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
      order: list.items.length + index,
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
      items: [...list.items, ...newItems],
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

    return { success: true, data: updatedList };
  } catch (error) {
    return { error: "Failed to create bulk items" };
  }
};

export const bulkToggleItems = async (formData: FormData) => {
  try {
    const listId = formData.get("listId") as string;
    const completed = formData.get("completed") === "true";
    const itemIdsStr = formData.get("itemIds") as string;
    const category = formData.get("category") as string;
    let currentUser = formData.get("username") as string;

    if (!currentUser) {
      currentUser = await getUsername();
    }

    if (!listId || !itemIdsStr) {
      return { error: "List ID and item IDs are required" };
    }

    const itemIds = JSON.parse(itemIdsStr);

    const list = await getListById(listId, currentUser, category);
    const canEdit = await checkUserPermission(
      listId,
      category,
      ItemTypes.CHECKLIST,
      currentUser,
      PermissionTypes.EDIT
    );

    if (!canEdit) {
      return { error: "Permission denied" };
    }

    if (!list) {
      return { error: "List not found" };
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
      completed: boolean,
      currentUser: string,
      now: string
    ): any[] => {
      return items.map((item) => {
        let updatedItem = { ...item };

        if (itemIds.includes(item.id)) {
          updatedItem.completed = completed;
          updatedItem.lastModifiedBy = currentUser;
          updatedItem.lastModifiedAt = now;

          if (completed && item.children && item.children.length > 0) {
            updatedItem.children = updateAllChildren(
              item.children,
              true,
              currentUser,
              now
            );
          } else if (!completed && item.children && item.children.length > 0) {
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
            completed,
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
      items: bulkUpdateItems(list.items, itemIds, completed, currentUser, now),
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
    return { success: true, data: updatedList };
  } catch (error) {
    console.error("Error bulk toggling items:", error);
    return { error: "Failed to bulk toggle items" };
  }
};

export const bulkDeleteItems = async (formData: FormData) => {
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
      return { error: "Permission denied" };
    }

    if (!list) {
      return { error: "List not found" };
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
    return { error: "Failed to bulk delete items" };
  }
};

export const createSubItem = async (formData: FormData) => {
  try {
    const listId = formData.get("listId") as string;
    const parentId = formData.get("parentId") as string;
    const text = formData.get("text") as string;
    const category = formData.get("category") as string;

    const isAdminUser = await isAdmin();
    const lists = await (isAdminUser ? getAllLists() : getLists());
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

    if (!addSubItemToParent(list.items, parentId, newSubItem)) {
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

    updateChildrenOrder(list.items);

    const updatedList = {
      ...list,
      items: list.items,
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

    return { success: true, data: updatedList };
  } catch (error) {
    console.error("Error creating sub-item:", error);
    return { error: "Failed to create sub-item" };
  }
};
