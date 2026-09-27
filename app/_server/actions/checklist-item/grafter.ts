import { revalidatePath } from "next/cache";
import path from "path";
import {
  serverWriteFile,
  ensureDir,
} from "@/app/_server/actions/file";
import { getListById } from "@/app/_server/actions/checklist/queries";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { Checklist, Item, Result, SanitisedUser } from "@/app/_types";
import {
  ItemTypes,
  PermissionTypes,
  Modes,
  TaskStatus,
  isKanbanType,
} from "@/app/_types/enums";
import { reachableFile } from "@/app/_server/actions/share/queries";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { itemLane, runQueued } from "@/app/_server/actions/lib/concurrency";

const _attach = (items: Item[], parentId: string, sprout: Item): boolean => {
  for (const item of items) {
    if (item.id === parentId) {
      item.children = item.children || [];
      item.children.push(sprout);
      item.completed = false;
      return true;
    }

    if (item.children && _attach(item.children, parentId, sprout)) {
      item.completed = false;
      return true;
    }
  }
  return false;
};

const _renumber = (items: Item[]) => {
  items.forEach((item, index) => {
    item.order = index;
    if (item.children) {
      _renumber(item.children);
    }
  });
};

const _graftItem = async (
  actor: SanitisedUser,
  formData: FormData,
): Promise<Result<Checklist>> => {
  try {
    const uuid = formData.get("uuid") as string;
    const parentId = formData.get("parentId") as string;
    const text = formData.get("text") as string;
    const status = formData.get("status") as string | null;
    const currentUser = actor?.username;

    if (!currentUser) {
      return { success: false, error: "Not authenticated" };
    }

    if (!uuid || !parentId || !text?.trim()) {
      return {
        success: false,
        error: "List uuid, parent item ID and text are required",
      };
    }

    const filePath = await reachableFile(
      uuid,
      ItemTypes.CHECKLIST,
      currentUser,
      PermissionTypes.EDIT,
    );

    if (!filePath) {
      throw new Error("Permission denied");
    }

    const list = await getListById(uuid, currentUser);
    if (!list) {
      throw new Error("List not found");
    }

    const now = new Date().toISOString();

    const sprout: Item = {
      id: `${list.uuid}-sub-${Date.now()}`,
      text,
      completed: false,
      order: 0,
      createdBy: currentUser,
      createdAt: now,
      lastModifiedBy: currentUser,
      lastModifiedAt: now,
    };

    if (isKanbanType(list.type)) {
      const initial = status || TaskStatus.TODO;
      sprout.status = initial;
      sprout.timeEntries = [];
      sprout.history = [
        {
          status: initial,
          timestamp: now,
          user: currentUser,
        },
      ];
    }

    const items = list.items || [];

    if (!_attach(items, parentId, sprout)) {
      throw new Error("Parent item not found");
    }

    _renumber(items);

    const updatedList: Checklist = {
      ...list,
      items,
      updatedAt: new Date().toISOString(),
    };

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

    return { success: true, data: updatedList };
  } catch (error) {
    console.error("Error creating sub-item:", error);
    return { success: false, error: "Failed to create sub-item" };
  }
};

export const graftItem = async (actor: SanitisedUser, formData: FormData) =>
  runQueued(itemLane(Modes.CHECKLISTS, formData.get("uuid") as string), () =>
    _graftItem(actor, formData),
  );
