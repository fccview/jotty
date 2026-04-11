"use server";

import { revalidatePath } from "next/cache";
import path from "path";
import { serverWriteFile, ensureDir } from "@/app/_server/actions/file";
import { getListById } from "@/app/_server/actions/checklist";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { getUsername } from "@/app/_server/actions/users";
import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";
import { Checklist, Result } from "@/app/_types";
import {
  ItemTypes,
  PermissionTypes,
  TaskStatus,
  isKanbanType,
} from "@/app/_types/enums";
import { checkUserPermission } from "../sharing";
import { broadcast } from "@/app/_server/ws/broadcast";

export const createSubItem = async (
  formData: FormData,
): Promise<Result<Checklist>> => {
  try {
    const uuid = formData.get("uuid") as string;
    const parentId = formData.get("parentId") as string;
    const text = formData.get("text") as string;

    if (!uuid) {
      throw new Error("UUID is required");
    }

    const currentUser = await getUsername();
    const list = await getListById(uuid, undefined, currentUser);

    if (!list) {
      throw new Error("List not found");
    }

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

    const addSubItemToParent = (
      items: any[],
      parentId: string,
      newSubItem: any,
    ): boolean => {
      for (let item of items) {
        if (item.id === parentId) {
          item.children = item.children || [];
          item.children.push(newSubItem);
          item.completed = false;
          return true;
        }

        if (
          item.children &&
          addSubItemToParent(item.children, parentId, newSubItem)
        ) {
          item.completed = false;
          return true;
        }
      }
      return false;
    };

    const now = new Date().toISOString();

    const newSubItem: any = {
      id: `${list.slug}-sub-${Date.now()}`,
      text,
      completed: false,
      order: 0,
      createdBy: currentUser,
      createdAt: now,
      lastModifiedBy: currentUser,
      lastModifiedAt: now,
    };

    if (isKanbanType(list.type)) {
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
      list.owner!,
    );
    const categoryDir = path.join(ownerDir, list.category || "Uncategorized");
    await ensureDir(categoryDir);

    const filePath = path.join(categoryDir, `${list.slug}.md`);

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
    console.error("Error creating sub-item:", error);
    return { success: false, error: "Failed to create sub-item" };
  }
};
