"use server";

import { revalidatePath } from "next/cache";
import { serverWriteFile } from "@/app/_server/actions/file";
import { getListById } from "@/app/_server/actions/checklist/queries";
import { areAllItemsCompleted, listToMarkdown } from "@/app/_utils/checklist-utils";
import { getUsername } from "@/app/_server/actions/users";
import { Checklist, Item, Result } from "@/app/_types";
import { ItemTypes, Modes, PermissionTypes } from "@/app/_types/enums";
import { canReach } from "@/app/_server/actions/share/queries";
import { diskPath } from "@/app/_server/actions/share/target";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { failedWith } from "@/app/_server/actions/lib/read-only-message";
import { itemLane, runQueued } from "@/app/_server/actions/lib/concurrency";
import { sessionActor } from "@/app/_server/actions/lib/actor";
import { addItem, editItem } from "./editor";

const _deleteItem = async (
  formData: FormData,
): Promise<Result<Checklist>> => {
  try {
    const uuid = formData.get("uuid") as string;
    const itemId = formData.get("itemId") as string;

    const currentUser = await getUsername();

    if (!currentUser) {
      throw new Error("Not authenticated");
    }

    const list = await getListById(uuid, currentUser);
    if (!list) {
      throw new Error("List not found");
    }

    const canDelete = await canReach(
      list.uuid!,
      ItemTypes.CHECKLIST,
      currentUser,
      PermissionTypes.DELETE,
    );

    if (!canDelete) {
      throw new Error("Permission denied");
    }

    const findItemExists = (items: any[], itemId: string): boolean => {
      for (const item of items) {
        if (item.id === itemId) {
          return true;
        }
        if (item.children && findItemExists(item.children, itemId)) {
          return true;
        }
      }
      return false;
    };

    const filterOutItem = (items: any[], itemId: string): any[] => {
      return items
        .filter((item) => item.id !== itemId)
        .map((item) => {
          const children = item.children
            ? filterOutItem(item.children, itemId)
            : undefined;
          const completed =
            children && children.length > 0 && areAllItemsCompleted(children)
              ? true
              : item.completed;

          return { ...item, children, completed };
        })
        .filter((item) => item.children?.length > 0 || item.id !== undefined);
    };

    const itemExists = findItemExists(list.items || [], itemId);
    if (!itemExists) {
      return { success: true };
    }

    const updatedList = {
      ...list,
      items: filterOutItem(list.items || [], itemId),
      updatedAt: new Date().toISOString(),
    };

    const filePath = await diskPath(Modes.CHECKLISTS, currentUser, list);

    await serverWriteFile(filePath, listToMarkdown(updatedList as Checklist));

    try {
      revalidatePath("/");
      revalidatePath(`/checklist/${list.uuid}`);
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
    console.error("Error deleting item:", error);
    return { success: false, error: await failedWith(error, "Failed to delete item") };
  }
};

export const updateItem = async (
  checklist: Checklist,
  formData: FormData,
  username?: string,
  skipRevalidation = false,
): Promise<Result<Checklist>> => {
  const actor = await sessionActor(username);

  if ("error" in actor) {
    return { success: false, error: actor.error };
  }

  return editItem(actor, checklist, formData, skipRevalidation);
};

export const createItem = async (
  list: Checklist,
  formData: FormData,
  username?: string,
  skipRevalidation = false,
): Promise<Result<Item>> => {
  const actor = await sessionActor(username);

  if ("error" in actor) {
    return { success: false, error: actor.error };
  }

  return addItem(actor, list, formData, skipRevalidation);
};

export const deleteItem = async (formData: FormData) =>
  runQueued(itemLane(Modes.CHECKLISTS, formData.get("uuid") as string), () =>
    _deleteItem(formData),
  );
