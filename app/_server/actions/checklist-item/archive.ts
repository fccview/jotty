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
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { getUsername } from "@/app/_server/actions/users";
import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";
import { Checklist, Result } from "@/app/_types";
import {
  ItemTypes,
  PermissionTypes,
} from "@/app/_types/enums";
import { checkUserPermission } from "../sharing";
import { broadcast } from "@/app/_server/ws/broadcast";

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

    await broadcast({ type: "checklist", action: "updated", entityId: listId, username: currentUser });

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

    await broadcast({ type: "checklist", action: "updated", entityId: listId, username: currentUser });

    return { success: true, data: updatedList as Checklist };
  } catch (error) {
    console.error("Error unarchiving item:", error);
    return { success: false, error: "Failed to unarchive item" };
  }
};
