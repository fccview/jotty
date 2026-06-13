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
import { Checklist, Result, TimeEntry } from "@/app/_types";
import {
  ItemTypes,
  PermissionTypes,
} from "@/app/_types/enums";
import { checkUserPermission } from "../sharing";
import { broadcast } from "@/app/_server/ws/broadcast";
import { updateItem } from "@/app/_utils/item-tree-utils";
import { applyStatus, completeParent } from "@/app/_utils/item-status-utils";

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

    let parsedTimeEntries: TimeEntry[] | null = null;
    if (timeEntriesStr) {
      try {
        const parsed = JSON.parse(timeEntriesStr);
        if (!Array.isArray(parsed)) {
          throw new Error("timeEntries must be an array");
        }
        parsedTimeEntries = parsed;
      } catch (e) {
        console.error("Failed to parse timeEntries:", e);
        return { success: false, error: "Invalid timeEntries payload" };
      }
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

    const statusItems = status
      ? applyStatus(list.items, itemId, status, list.statuses, username, now)
      : list.items;

    const updatedItems = parsedTimeEntries
      ? updateItem(statusItems, itemId, (item) => ({
          ...item,
          timeEntries: parsedTimeEntries!.map((entry) => ({
            ...entry,
            user: entry.user || username,
          })),
        }))
      : statusItems;

    const itemsWithParentAutoComplete = completeParent(
      updatedItems, itemId, list.statuses, username, now
    );

    const updatedList = {
      ...list,
      items: itemsWithParentAutoComplete,
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
