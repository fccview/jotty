"use server";

import { Checklist, Item, ChecklistType, KanbanStatus, Result } from "@/app/_types";
import {
  ItemTypes,
  Modes,
  PermissionTypes,
  TaskStatus,
  isKanbanType,
} from "@/app/_types/enums";
import { getCurrentUser } from "@/app/_server/actions/users";
import { serverWriteFile } from "@/app/_server/actions/file";
import { revalidatePath } from "next/cache";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { getFormData } from "@/app/_utils/global-utils";
import { reachableFile } from "@/app/_server/actions/share/queries";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { sessionActor } from "@/app/_server/actions/lib/actor";
import { itemLane, runQueued } from "@/app/_server/actions/lib/concurrency";
import { getListById } from "./queries";
import { restatus } from "./restatus";

const _convert = async (
  username: string,
  uuid: string,
  newType: ChecklistType,
) => {
  try {
    const filePath = await reachableFile(
      uuid,
      ItemTypes.CHECKLIST,
      username,
      PermissionTypes.EDIT,
    );
    if (!filePath) return { success: false, error: "Permission denied" };

    const list = await getListById(uuid, username);

    if (!list || !list.id || !list.createdAt) {
      throw new Error("List not found or is malformed");
    }

    if (list.type === newType) {
      return { success: true };
    }

    let convertedItems: Item[];

    if (isKanbanType(newType)) {
      const statuses = list.statuses || [];
      const completionStatus =
        statuses.find((s) => s.autoComplete) ||
        statuses.find((s) => s.id === TaskStatus.COMPLETED);
      const completionStatusId = completionStatus?.id || TaskStatus.COMPLETED;
      const sortedStatuses = [...statuses].sort((a, b) => a.order - b.order);
      const firstStatusId = sortedStatuses[0]?.id || TaskStatus.TODO;

      convertedItems = (list.items || []).map((item) => {
        let status = item.status;
        if (!status) {
          status = item.completed ? completionStatusId : firstStatusId;
        } else if (
          statuses.length > 0 &&
          !statuses.some((s) => s.id === status)
        ) {
          status = item.completed ? completionStatusId : firstStatusId;
        }
        return {
          ...item,
          status,
          completed:
            item.completed ||
            (completionStatus?.autoComplete && status === completionStatusId) ||
            false,
          timeEntries: item.timeEntries || [],
        };
      });
    } else {
      convertedItems = (list.items || []).map((item) => ({
        ...item,
      }));
    }

    const updatedList: Checklist = {
      id: list.id,
      uuid: list.uuid,
      title: list.title || "",
      category: list.category,
      createdAt: list.createdAt,
      owner: list.owner,
      isShared: list.isShared,
      isDeleted: list.isDeleted,
      type: newType,
      items: convertedItems,
      updatedAt: new Date().toISOString(),
      ...(list.statuses && { statuses: list.statuses }),
      ...(list.tags && { tags: list.tags }),
      ...(list.sharedWith !== undefined && { sharedWith: list.sharedWith }),
      ...(list.specNote && { specNote: list.specNote }),
      ...(list.extraMetadata && { extraMetadata: list.extraMetadata }),
    };

    await serverWriteFile(filePath, listToMarkdown(updatedList));

    try {
      revalidatePath("/");
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error,
      );
    }
    await broadcast({
      type: "checklist",
      action: "updated",
      entityId: updatedList.uuid,
      username,
    });
    return { success: true, data: updatedList };
  } catch (error) {
    console.error("Error converting checklist type:", error);
    return { success: false, error: "Failed to convert checklist type" };
  }
};

export const convertChecklistType = async (
  formData: FormData,
): Promise<Result<Checklist>> => {
  const { newType: type, uuid } = getFormData(formData, ["newType", "uuid"]);
  const newType = type as ChecklistType;

  if (!uuid || !newType) {
    return { success: false, error: "UUID and type are required" };
  }

  const actor = await sessionActor();
  if ("error" in actor) return { success: false, error: actor.error };

  return runQueued(itemLane(Modes.CHECKLISTS, uuid), () =>
    _convert(actor.username, uuid, newType),
  );
};

export const updateChecklistStatuses = async (
  formData: FormData,
): Promise<Result<Checklist>> => {
  try {
    const { uuid, statusesStr } = getFormData(formData, [
      "uuid",
      "statusesStr",
    ]);

    if (!uuid || !statusesStr) {
      console.error("Missing uuid or statusesStr");
      return { success: false, error: "UUID and statuses are required" };
    }

    const actor = await sessionActor();
    if ("error" in actor) return { success: false, error: actor.error };

    const statuses = JSON.parse(statusesStr) as KanbanStatus[];

    return await restatus(actor, uuid, () => statuses);
  } catch (error) {
    console.error("Error updating checklist statuses:", error);
    return { success: false, error: "Failed to update checklist statuses" };
  }
};

const _clearItems = async (
  username: string,
  uuid: string,
  type: "completed" | "incomplete",
) => {
  try {
    const filePath = await reachableFile(
      uuid,
      ItemTypes.CHECKLIST,
      username,
      PermissionTypes.EDIT,
    );

    if (!filePath) {
      return { success: false, error: "Permission denied" };
    }

    const checklist = await getListById(uuid);

    if (!checklist) {
      return { success: false, error: "Checklist not found" };
    }

    const filteredItems = checklist.items.filter((item) => {
      if (type === "completed") {
        return !item.completed;
      } else {
        return item.completed;
      }
    });

    const updatedChecklist: Checklist = {
      ...checklist,
      items: filteredItems,
      updatedAt: new Date().toISOString(),
    };

    await serverWriteFile(filePath, listToMarkdown(updatedChecklist));

    try {
      revalidatePath("/");
      revalidatePath(`/checklist/${checklist.uuid}`);
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error,
      );
    }

    await broadcast({
      type: "checklist",
      action: "updated",
      entityId: checklist.uuid,
      username,
    });

    return { success: true, data: updatedChecklist };
  } catch (error) {
    console.error("Error clearing checklist items:", error);
    return { success: false, error: "Failed to clear checklist items" };
  }
};

export const clearAllChecklistItems = async (
  formData: FormData,
): Promise<Result<Checklist>> => {
  const uuid = formData.get("uuid") as string;
  const type = formData.get("type") as "completed" | "incomplete";

  const actingUser = await getCurrentUser();

  if (!actingUser?.username) {
    return { success: false, error: "Not authenticated" };
  }

  return runQueued(itemLane(Modes.CHECKLISTS, uuid), () =>
    _clearItems(actingUser.username, uuid, type),
  );
};
