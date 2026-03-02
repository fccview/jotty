"use server";

import path from "path";
import { Checklist, Item, ChecklistType } from "@/app/_types";
import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";
import {
  ItemTypes,
  Modes,
  PermissionTypes,
  TaskStatus,
} from "@/app/_types/enums";
import { getCurrentUser } from "@/app/_server/actions/users";
import { getUserModeDir, serverWriteFile } from "@/app/_server/actions/file";
import { revalidatePath } from "next/cache";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { buildCategoryPath, getFormData } from "@/app/_utils/global-utils";
import {
  updateIndexForItem,
  parseInternalLinks,
} from "@/app/_server/actions/link";
import { checkUserPermission } from "@/app/_server/actions/sharing";
import { broadcast } from "@/app/_server/ws/broadcast";
import { getListById, getUserChecklists } from "./queries";

export const convertChecklistType = async (formData: FormData) => {
  try {
    const {
      listId,
      newType: type,
      uuid,
    } = getFormData(formData, ["listId", "newType", "uuid"]);
    const newType = type as ChecklistType;

    if (!listId || !newType) {
      return { error: "List ID and type are required" };
    }

    let list = await getListById(uuid);

    if (!list) {
      const lists = await getUserChecklists();

      if (!lists.success || !lists.data) {
        throw new Error(lists.error || "Failed to fetch lists");
      }

      list = lists.data.find((l) => l.uuid === uuid) as Checklist;
    }

    if (!list || !list.id || !list.createdAt) {
      throw new Error("List not found or is malformed");
    }

    if (list.type === newType) {
      return { success: true };
    }

    let filePath: string;
    const categoryDir = list.category || "Uncategorized";
    const filename = `${list.id}.md`;

    if (list.owner) {
      const ownerDir = path.join(
        process.cwd(),
        "data",
        CHECKLISTS_FOLDER,
        list.owner,
      );
      filePath = path.join(ownerDir, categoryDir, filename);
    } else {
      const userDir = await getUserModeDir(Modes.CHECKLISTS);
      filePath = path.join(userDir, categoryDir, filename);
    }

    let convertedItems: any[];

    if (newType === "task") {
      convertedItems = (list.items || []).map((item) => ({
        ...item,
        status:
          item.status ||
          (item.completed ? TaskStatus.COMPLETED : TaskStatus.TODO),
        timeEntries: item.timeEntries || [],
      }));
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
      items: convertedItems as Item[],
      updatedAt: new Date().toISOString(),
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
    const currentUser = await getCurrentUser();
    await broadcast({
      type: "checklist",
      action: "updated",
      entityId: updatedList.uuid || updatedList.id,
      username: currentUser?.username || "",
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
      console.error("Missing uuid or statusesStr");
      return { error: "UUID and statuses are required" };
    }

    const lists = await getUserChecklists();
    if (!lists.success || !lists.data) {
      console.error("Failed to fetch lists:", lists.error);
      throw new Error(lists.error || "Failed to fetch lists");
    }

    const list = lists.data.find((l) => l.uuid === uuid) as Checklist;

    if (!list || !list.id || !list.createdAt) {
      console.error("List not found or malformed:", { list });
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

    const currentUser = await getCurrentUser();
    const username = currentUser?.username;
    if (!username) {
      throw new Error("Username not found");
    }

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

    let filePath: string;

    if (list.isShared) {
      const ownerDir = path.join(
        process.cwd(),
        "data",
        CHECKLISTS_FOLDER,
        list.owner!,
      );
      filePath = path.join(
        ownerDir,
        list.category || "Uncategorized",
        `${list.id}.md`,
      );
    } else {
      const userDir = await getUserModeDir(Modes.CHECKLISTS);
      filePath = path.join(
        userDir,
        list.category || "Uncategorized",
        `${list.id}.md`,
      );
    }

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
      revalidatePath(`/checklist/${list.id}`);
      if (list.category) {
        revalidatePath(`/category/${list.category}`);
      }
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
    const id = formData.get("id") as string;
    const category = formData.get("category") as string;
    const ownerUsername = formData.get("user") as string | null;
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
      id,
      ownerUsername || undefined,
      category,
    );

    if (!checklist) {
      return { error: "Checklist not found" };
    }

    const canEdit = await checkUserPermission(
      id,
      category,
      ItemTypes.CHECKLIST,
      actingUser.username,
      PermissionTypes.EDIT,
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
    const categoryDir = path.join(
      ownerDir,
      checklist.category || "Uncategorized",
    );
    const filePath = path.join(categoryDir, `${checklist.id}.md`);

    await serverWriteFile(filePath, listToMarkdown(updatedChecklist));

    try {
      const content = updatedChecklist.items.map((i) => i.text).join("\n");
      const links = await parseInternalLinks(content);
      await updateIndexForItem(
        checklist.owner!,
        ItemTypes.CHECKLIST,
        updatedChecklist.uuid!,
        links,
      );
    } catch (error) {
      console.warn(
        "Failed to update link index for checklist:",
        updatedChecklist.id,
        error,
      );
    }

    try {
      revalidatePath("/");
      const categoryPath = buildCategoryPath(
        checklist.category || "Uncategorized",
        checklist.id,
      );
      revalidatePath(`/checklist/${categoryPath}`);
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
