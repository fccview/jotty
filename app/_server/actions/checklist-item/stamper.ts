import { revalidatePath } from "next/cache";
import path from "path";
import {
  serverWriteFile,
  ensureDir,
} from "@/app/_server/actions/file";
import { getListById } from "@/app/_server/actions/checklist/queries";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { Checklist, Result, SanitisedUser, TimeEntry } from "@/app/_types";
import {
  ItemTypes,
  PermissionTypes,
  Modes,
} from "@/app/_types/enums";
import { canReach } from "@/app/_server/actions/share/queries";
import { diskPath } from "@/app/_server/actions/share/target";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { updateItem } from "@/app/_utils/item-tree-utils";
import { applyStatus, completeParent } from "@/app/_utils/item-status-utils";
import { failedWith } from "@/app/_server/actions/lib/read-only-message";
import { itemLane, runQueued } from "@/app/_server/actions/lib/concurrency";
import { boardColumns, unknownStatus } from "@/app/_consts/kanban";

const _stampStatus = async (
  actor: SanitisedUser,
  formData: FormData,
): Promise<Result<Checklist>> => {
  try {
    const uuid = formData.get("uuid") as string;
    const itemId = formData.get("itemId") as string;
    const status = formData.get("status") as string;
    const timeEntriesStr = formData.get("timeEntries") as string;
    const username = actor?.username;

    if (!username) {
      return { success: false, error: "Not authenticated" };
    }

    if (!uuid || !itemId) {
      return { success: false, error: "List uuid and item ID are required" };
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
        const allObjects = parsed.every(
          (entry) =>
            entry !== null &&
            typeof entry === "object" &&
            !Array.isArray(entry)
        );
        if (!allObjects) {
          throw new Error("timeEntries must contain objects");
        }
        parsedTimeEntries = parsed;
      } catch (e) {
        console.error("Failed to parse timeEntries:", e);
        return { success: false, error: "Invalid timeEntries payload" };
      }
    }

    const list = await getListById(uuid, username);
    if (!list) {
      return { success: false, error: "List not found" };
    }

    const canEdit = await canReach(
      list.uuid!,
      ItemTypes.CHECKLIST,
      username,
      PermissionTypes.EDIT
    );

    if (!canEdit) {
      return { success: false, error: "Permission denied" };
    }

    if (status && !boardColumns(list.statuses).some((column) => column.id === status)) {
      return { success: false, error: unknownStatus(list.statuses) };
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

    const filePath = await diskPath(Modes.CHECKLISTS, username, list);
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
    await broadcast({ type: "checklist", action: "updated", entityId: list.uuid, username });

    return { success: true, data: updatedList as Checklist };
  } catch (error) {
    console.error("Error updating item status:", error);
    return { success: false, error: await failedWith(error, "Failed to update item status") };
  }
};

export const stampStatus = async (actor: SanitisedUser, formData: FormData) =>
  runQueued(itemLane(Modes.CHECKLISTS, formData.get("uuid") as string), () =>
    _stampStatus(actor, formData),
  );
