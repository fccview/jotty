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
import { Checklist, Result } from "@/app/_types";
import {
  ItemTypes,
  PermissionTypes,
  Modes,
} from "@/app/_types/enums";
import { canReach } from "@/app/_server/actions/share/queries";
import { diskPath } from "@/app/_server/actions/share/target";
import { broadcast } from "@/app/_server/actions/ws/broadcast";

export const archiveItem = async (
  formData: FormData
): Promise<Result<Checklist>> => {
  try {
    const uuid = formData.get("uuid") as string;
    const itemId = formData.get("itemId") as string;

    const currentUser = await getUsername();

    if (!uuid || !itemId) {
      return { success: false, error: "List uuid and item ID are required" };
    }

    const list = await getListById(uuid, currentUser);
    if (!list) {
      return { success: false, error: "List not found" };
    }

    const canEdit = await canReach(
      list.uuid!,
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

    const filePath = await diskPath(Modes.CHECKLISTS, currentUser, list);
    await ensureDir(path.dirname(filePath));

    await serverWriteFile(filePath, listToMarkdown(updatedList));

    try {
      revalidatePath("/");
      revalidatePath(`/checklist/${list.uuid}`);
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error
      );
    }

    await broadcast({ type: "checklist", action: "updated", entityId: list.uuid, username: currentUser });

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
    const uuid = formData.get("uuid") as string;
    const itemId = formData.get("itemId") as string;

    const currentUser = await getUsername();

    if (!uuid || !itemId) {
      return { success: false, error: "List uuid and item ID are required" };
    }

    const list = await getListById(uuid, currentUser);
    if (!list) {
      return { success: false, error: "List not found" };
    }

    const canEdit = await canReach(
      list.uuid!,
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

    const filePath = await diskPath(Modes.CHECKLISTS, currentUser, list);
    await ensureDir(path.dirname(filePath));

    await serverWriteFile(filePath, listToMarkdown(updatedList));

    try {
      revalidatePath("/");
      revalidatePath(`/checklist/${list.uuid}`);
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error
      );
    }

    await broadcast({ type: "checklist", action: "updated", entityId: list.uuid, username: currentUser });

    return { success: true, data: updatedList as Checklist };
  } catch (error) {
    console.error("Error unarchiving item:", error);
    return { success: false, error: "Failed to unarchive item" };
  }
};
