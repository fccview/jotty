"use server";

import path from "path";
import { Checklist, Item, ChecklistType } from "@/app/_types";
import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";
import {
  ItemTypes,
  PermissionTypes,
  TaskStatus,
  isKanbanType,
} from "@/app/_types/enums";
import { getCurrentUser } from "@/app/_server/actions/users";
import { serverWriteFile } from "@/app/_server/actions/file";
import { revalidatePath } from "next/cache";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { getFormData } from "@/app/_utils/global-utils";
import {
  updateIndexForItem,
  parseInternalLinks,
} from "@/app/_server/actions/link";
import { checkUserPermission } from "@/app/_server/actions/sharing";
import { broadcast } from "@/app/_server/ws/broadcast";
import { getListById } from "./queries";

export const convertChecklistType = async (formData: FormData) => {
  try {
    const { uuid, newType: type } = getFormData(formData, ["uuid", "newType"]);
    const newType = type as ChecklistType;

    if (!uuid || !newType) {
      return { error: "UUID and type are required" };
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { error: "Not authenticated" };
    }

    const list = await getListById(uuid, undefined, currentUser.username);

    if (!list || !list.slug || !list.createdAt) {
      throw new Error("List not found or is malformed");
    }

    if (list.type === newType) {
      return { success: true };
    }

    const ownerDir = path.join(
      process.cwd(),
      "data",
      CHECKLISTS_FOLDER,
      list.owner!,
    );
    const filePath = path.join(
      ownerDir,
      list.category || "Uncategorized",
      `${list.slug}.md`,
    );

    let convertedItems: any[];

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
      slug: list.slug,
      uuid: list.uuid,
      title: list.title || "",
      category: list.category,
      createdAt: list.createdAt,
      owner: list.owner,
      isShared: list.isShared,
      isDeleted: list.isDeleted,
      type: newType,
      items: convertedItems as Item[],
      updatedAt: new Date().toISOString(),
      ...(list.statuses && { statuses: list.statuses }),
      ...(list.tags && { tags: list.tags }),
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
      username: currentUser.username,
    });
    return { success: true, data: updatedList };
  } catch (error) {
    console.error("Error converting checklist type:", error);
    return { error: "Failed to convert checklist type" };
  }
};

export const updateChecklistStatuses = async (formData: FormData) => {
  try {
    const { uuid, statusesStr } = getFormData(formData, [
      "uuid",
      "statusesStr",
    ]);

    if (!uuid || !statusesStr) {
      return { error: "UUID and statuses are required" };
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { error: "Not authenticated" };
    }

    const list = await getListById(uuid, undefined, currentUser.username);

    if (!list || !list.slug || !list.createdAt) {
      throw new Error("List not found or is malformed");
    }

    const statuses = JSON.parse(statusesStr);

    const oldStatusIds = (list.statuses || []).map((s) => s.id);
    const newStatusIds = statuses.map((s: any) => s.id);
    const removedStatusIds = oldStatusIds.filter(
      (id) => !newStatusIds.includes(id),
    );

    const sortedStatuses = [...statuses].sort(
      (a: any, b: any) => a.order - b.order,
    );
    const firstStatus = sortedStatuses[0];
    const defaultStatusId = firstStatus?.id || "todo";

    const username = currentUser.username;

    const now = new Date().toISOString();
    const updatedItems = list.items.map((item) => {
      if (removedStatusIds.includes(item.status || "")) {
        const history = item.history || [];
        history.push({
          status: defaultStatusId,
          timestamp: now,
          user: username,
        });

        return {
          ...item,
          status: defaultStatusId,
          lastModifiedBy: username,
          lastModifiedAt: now,
          history,
        };
      }
      return item;
    });

    const ownerDir = path.join(
      process.cwd(),
      "data",
      CHECKLISTS_FOLDER,
      list.owner!,
    );
    const filePath = path.join(
      ownerDir,
      list.category || "Uncategorized",
      `${list.slug}.md`,
    );

    const updatedList: Checklist = {
      ...list,
      items: updatedItems,
      statuses,
      updatedAt: new Date().toISOString(),
    };

    const markdown = listToMarkdown(updatedList);
    await serverWriteFile(filePath, markdown);

    try {
      revalidatePath("/", "layout");
      revalidatePath(`/checklist/${list.owner}/${list.uuid}`);
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error,
      );
    }
    return { success: true, data: updatedList };
  } catch (error) {
    console.error("Error updating checklist statuses:", error);
    return { error: "Failed to update checklist statuses" };
  }
};

export const clearAllChecklistItems = async (formData: FormData) => {
  try {
    const uuid = formData.get("uuid") as string;
    const type = formData.get("type") as "completed" | "incomplete";
    const apiUser = formData.get("apiUser") as string | null;

    let actingUser = await getCurrentUser();
    if (!actingUser && apiUser) {
      try {
        actingUser = JSON.parse(apiUser);
      } catch {
        return { error: "Invalid user data" };
      }
    }

    if (!actingUser || !actingUser.username) {
      return { error: "Not authenticated" };
    }

    const checklist = await getListById(
      uuid,
      undefined,
      actingUser.username,
    );

    if (!checklist) {
      return { error: "Checklist not found" };
    }

    const canEdit = await checkUserPermission(
      checklist.uuid,
      ItemTypes.CHECKLIST,
      actingUser.username,
      PermissionTypes.EDIT,
      checklist.owner,
    );

    if (!canEdit) {
      return { error: "Permission denied" };
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

    const ownerDir = path.join(
      process.cwd(),
      "data",
      CHECKLISTS_FOLDER,
      checklist.owner!,
    );
    const filePath = path.join(
      ownerDir,
      checklist.category || "Uncategorized",
      `${checklist.slug}.md`,
    );

    await serverWriteFile(filePath, listToMarkdown(updatedChecklist));

    try {
      const content = updatedChecklist.items.map((i) => i.text).join("\n");
      const links = await parseInternalLinks(content);
      await updateIndexForItem(
        checklist.owner!,
        ItemTypes.CHECKLIST,
        updatedChecklist.uuid,
        links,
      );
    } catch (error) {
      console.warn(
        "Failed to update link index for checklist:",
        updatedChecklist.uuid,
        error,
      );
    }

    try {
      revalidatePath("/");
      revalidatePath(`/checklist/${checklist.owner}/${checklist.uuid}`);
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error,
      );
    }

    return { success: true, data: updatedChecklist };
  } catch (error) {
    console.error("Error clearing checklist items:", error);
    return { error: "Failed to clear checklist items" };
  }
};
