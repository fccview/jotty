"use server";

import { getUsername } from "@/app/_server/actions/users";
import { DropPosition } from "@/app/_types/enums";
import { Rearranged, rearrangeItems } from "./rearrange";

const FAILED = "Failed to reorder items";

const DONE = new Set([Rearranged.MOVED, Rearranged.UNCHANGED]);

export const reorderItems = async (formData: FormData) => {
  const uuid = formData.get("uuid") as string;
  const activeItemId = formData.get("activeItemId") as string;

  if (!uuid || !activeItemId) {
    return { success: false, error: "List uuid and item ID are required" };
  }

  try {
    const outcome = await rearrangeItems(await getUsername(), {
      listUuid: uuid,
      activeItemId,
      overItemId: formData.get("overItemId") as string,
      isDropInto: formData.get("isDropInto") === "true",
      position: formData.get("position") === DropPosition.AFTER ? DropPosition.AFTER : DropPosition.BEFORE,
    });
    if (DONE.has(outcome)) return { success: true };
    console.error(`Error reordering items: ${outcome}`);
    return { success: false, error: FAILED };
  } catch (error) {
    console.error("Error reordering items:", error);
    return { success: false, error: FAILED };
  }
};
