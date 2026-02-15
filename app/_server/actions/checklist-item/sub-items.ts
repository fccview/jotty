"use server";

import { revalidatePath } from "next/cache";
import path from "path";
import {
  serverWriteFile,
  ensureDir,
} from "@/app/_server/actions/file";
import {
  getAllLists,
  getUserChecklists,
} from "@/app/_server/actions/checklist";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { isAdmin, getUsername } from "@/app/_server/actions/users";
import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";
import { Checklist, Result } from "@/app/_types";
import {
  ItemTypes,
  PermissionTypes,
  TaskStatus,
} from "@/app/_types/enums";
import { checkUserPermission } from "../sharing";
import { broadcast } from "@/app/_server/ws/broadcast";

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

    await broadcast({ type: "checklist", action: "updated", entityId: listId, username: currentUser });

    return { success: true, data: updatedList as Checklist };
  } catch (error) {
    console.error("Error creating sub-item:", error);
    return { success: false, error: "Failed to create sub-item" };
  }
};
