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
import { updateItem, updateAllChildren } from "@/app/_utils/item-tree-utils";

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
    if (!list) {
      return { success: false, error: "List not found" };
    }

    const canEdit = await checkUserPermission(
      list.uuid || listId,
      category,
      ItemTypes.CHECKLIST,
      username,
      PermissionTypes.EDIT
    );

    if (!canEdit) {
      return { success: false, error: "Permission denied" };
    }

    const now = new Date().toISOString();

    const updatedItems = updateItem(list.items, itemId, (item) => {
      const updates: Partial<typeof item> & { history?: typeof item.history; timeEntries?: typeof item.timeEntries } = {};

      if (status) {
        updates.status = status;
        updates.lastModifiedBy = username;
        updates.lastModifiedAt = now;

        const targetStatus = list.statuses?.find((s) => s.id === status);
        if (targetStatus?.autoComplete) {
          updates.completed = true;
          if (item.children && item.children.length > 0) {
            updates.children = updateAllChildren(item.children, true, username, now);
          }
        } else if (item.completed && status !== item.status) {
          updates.completed = false;
        }

        if (status !== item.status) {
          const history = [...(item.history || [])];
          history.push({ status, timestamp: now, user: username });
          updates.history = history;
        }
      }

      if (timeEntriesStr) {
        try {
          const timeEntries = JSON.parse(timeEntriesStr);
          updates.timeEntries = timeEntries.map((entry: { user?: string }) => ({
            ...entry,
            user: entry.user || username,
          }));
        } catch (e) {
          console.error("Failed to parse timeEntries:", e);
        }
      }

      return { ...item, ...updates };
    });

    const updatedList = {
      ...list,
      items: updatedItems,
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
    await broadcast({ type: "checklist", action: "updated", entityId: listId, username });

    return { success: true, data: updatedList as Checklist };
  } catch (error) {
    console.error("Error updating item status:", error);
    return { success: false, error: "Failed to update item status" };
  }
};
