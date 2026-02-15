"use server";

import { revalidatePath } from "next/cache";
import path from "path";
import {
  getUserModeDir,
  serverWriteFile,
} from "@/app/_server/actions/file";
import {
  getUserChecklists,
  getListById,
} from "@/app/_server/actions/checklist";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { getUsername } from "@/app/_server/actions/users";
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

    const now = new Date().toISOString();

    const lines = itemsText.split("\n").filter((line) => line.trim());
    const shiftedItems = (list.items || []).map((item) => ({
      ...item,
      order: item.order + lines.length,
    }));
    const newItems = lines.map((text, index) => ({
      id: `${listId}-${Date.now()}-${index}`,
      text: text.trim(),
      completed: false,
      order: index,
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
      items: [...newItems, ...shiftedItems],
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

    await broadcast({ type: "checklist", action: "updated", entityId: listId, username: currentUser });

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
    if (!list) {
      return { success: false, error: "List not found" };
    }

    const canEdit = await checkUserPermission(
      list.uuid || listId,
      category,
      ItemTypes.CHECKLIST,
      currentUser,
      PermissionTypes.EDIT
    );

    if (!canEdit) {
      return { success: false, error: "Permission denied" };
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
    await broadcast({ type: "checklist", action: "updated", entityId: listId, username: currentUser });

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
    if (!list) {
      return { success: false, error: "List not found" };
    }

    const canEdit = await checkUserPermission(
      list.uuid || listId,
      category,
      ItemTypes.CHECKLIST,
      currentUser,
      PermissionTypes.EDIT
    );

    if (!canEdit) {
      return { success: false, error: "Permission denied" };
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

    await broadcast({ type: "checklist", action: "updated", entityId: listId, username: currentUser });

    return { success: true };
  } catch (error) {
    console.error("Error during bulk delete:", error);
    return { success: false, error: "Failed to bulk delete items" };
  }
};
