import { revalidatePath } from "next/cache";
import { serverWriteFile } from "@/app/_server/actions/file";
import { getListById } from "@/app/_server/actions/checklist/queries";
import { areAllItemsCompleted, listToMarkdown } from "@/app/_utils/checklist-utils";
import { Checklist, Item, Result, SanitisedUser } from "@/app/_types";
import { ItemTypes, Modes, PermissionTypes } from "@/app/_types/enums";
import { reachableFile } from "@/app/_server/actions/share/queries";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { failedWith } from "@/app/_server/actions/lib/read-only-message";
import { itemLane, runQueued } from "@/app/_server/actions/lib/concurrency";

const _holds = (items: Item[], itemId: string): boolean =>
  items.some(
    (item) => item.id === itemId || _holds(item.children || [], itemId),
  );

const _without = (items: Item[], itemId: string): Item[] =>
  items
    .filter((item) => item.id !== itemId)
    .map((item) => {
      const children = item.children
        ? _without(item.children, itemId)
        : undefined;
      const completed =
        children && children.length > 0 && areAllItemsCompleted(children)
          ? true
          : item.completed;

      return { ...item, children, completed };
    });

const _removeItem = async (
  actor: SanitisedUser,
  uuid: string,
  itemId: string,
): Promise<Result<Checklist>> => {
  try {
    const currentUser = actor?.username;

    if (!currentUser) {
      throw new Error("Not authenticated");
    }

    const filePath = await reachableFile(
      uuid,
      ItemTypes.CHECKLIST,
      currentUser,
      PermissionTypes.DELETE,
    );

    if (!filePath) {
      throw new Error("Permission denied");
    }

    const list = await getListById(uuid, currentUser);
    if (!list) {
      throw new Error("List not found");
    }

    if (!_holds(list.items || [], itemId)) {
      return { success: true };
    }

    const updatedList: Checklist = {
      ...list,
      items: _without(list.items || [], itemId),
      updatedAt: new Date().toISOString(),
    };

    await serverWriteFile(filePath, listToMarkdown(updatedList));

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

    return { success: true, data: updatedList };
  } catch (error) {
    console.error("Error deleting item:", error);
    return { success: false, error: await failedWith(error, "Failed to delete item") };
  }
};

export const removeItem = async (
  actor: SanitisedUser,
  uuid: string,
  itemId: string,
) =>
  runQueued(itemLane(Modes.CHECKLISTS, uuid), () =>
    _removeItem(actor, uuid, itemId),
  );
