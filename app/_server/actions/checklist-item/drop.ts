"use server";

import { revalidatePath } from "next/cache";
import path from "path";
import { serverWriteFile, ensureDir } from "@/app/_server/actions/file";
import { getListById } from "@/app/_server/actions/checklist";
import { getUsername } from "@/app/_server/actions/users";
import { checkUserPermission } from "../sharing";
import { broadcast } from "@/app/_server/ws/broadcast";
import { applyDrop } from "@/app/_utils/kanban/board-utils";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";
import { Checklist, Result } from "@/app/_types";
import { ItemTypes, PermissionTypes } from "@/app/_types/enums";

export const dropItem = async (
  formData: FormData,
): Promise<Result<Checklist>> => {
  try {
    const uuid = formData.get("uuid") as string;
    const itemId = formData.get("itemId") as string;
    const targetStatus = formData.get("targetStatus") as string;
    const targetIndex = Number(formData.get("targetIndex"));

    if (!uuid || !itemId || !targetStatus || Number.isNaN(targetIndex)) {
      return {
        success: false,
        error: "uuid, itemId, targetStatus and targetIndex are required",
      };
    }

    const username = await getUsername();
    const list = await getListById(uuid);
    if (!list) {
      return { success: false, error: "List not found" };
    }

    const canEdit = await checkUserPermission(
      list.uuid || list.id,
      list.category || "Uncategorized",
      ItemTypes.CHECKLIST,
      username,
      PermissionTypes.EDIT,
    );
    if (!canEdit) {
      return { success: false, error: "Permission denied" };
    }

    if (!list.items.some((item) => item.id === itemId)) {
      return { success: false, error: "Item not found" };
    }

    const now = new Date().toISOString();
    const updatedList = applyDrop(
      list,
      itemId,
      targetStatus,
      Math.max(0, targetIndex),
      username,
      now,
    );

    const categoryDir = path.join(
      process.cwd(),
      "data",
      CHECKLISTS_FOLDER,
      list.owner!,
      list.category || "Uncategorized",
    );
    await ensureDir(categoryDir);
    await serverWriteFile(
      path.join(categoryDir, `${list.id}.md`),
      listToMarkdown(updatedList),
    );

    try {
      revalidatePath("/");
      revalidatePath(`/checklist/${list.id}`);
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error,
      );
    }

    await broadcast({
      type: "checklist",
      action: "updated",
      entityId: list.id,
      username,
    });

    return { success: true, data: updatedList };
  } catch (error) {
    console.error("Error dropping item:", error);
    return { success: false, error: "Failed to drop item" };
  }
};
