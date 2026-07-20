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
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { DEFAULT_KANBAN_STATUSES } from "@/app/_consts/kanban";
import { Checklist, Result } from "@/app/_types";
import { ItemTypes, PermissionTypes } from "@/app/_types/enums";

export const dropItem = async (
  formData: FormData,
): Promise<Result<Checklist>> => {
  try {
    const uuid = formData.get("uuid") as string;
    const itemId = formData.get("itemId") as string;
    const targetStatus = formData.get("targetStatus") as string;
    const targetIndexRaw = formData.get("targetIndex");

    if (
      !uuid ||
      !itemId ||
      !targetStatus ||
      targetIndexRaw === null ||
      targetIndexRaw === ""
    ) {
      return {
        success: false,
        error: "uuid, itemId, targetStatus and targetIndex are required",
      };
    }

    const targetIndex = Number(targetIndexRaw);
    if (Number.isNaN(targetIndex)) {
      return { success: false, error: "targetIndex must be a number" };
    }

    const username = await getUsername();
    const list = await getListById(uuid);
    if (!list) {
      return { success: false, error: "List not found" };
    }

    const canEdit = await checkUserPermission(
      list.uuid!,
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

    const statuses =
      list.statuses && list.statuses.length > 0
        ? list.statuses
        : DEFAULT_KANBAN_STATUSES;
    const isValidStatus = statuses.some((s) => s.id === targetStatus);
    if (!isValidStatus) {
      return { success: false, error: "Invalid target status" };
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
      list.category || UNCATEGORIZED,
    );
    await ensureDir(categoryDir);
    await serverWriteFile(
      path.join(categoryDir, `${list.id}.md`),
      listToMarkdown(updatedList),
    );

    try {
      revalidatePath("/");
      revalidatePath(`/checklist/${list.uuid}`);
    } catch (error) {
      console.warn(
        "Cache revalidation failed, but data was saved successfully:",
        error,
      );
    }

    try {
      await broadcast({
        type: "checklist",
        action: "updated",
        entityId: list.uuid,
        username,
      });
    } catch (error) {
      console.warn("Broadcast failed, but data was saved successfully:", error);
    }

    return { success: true, data: updatedList };
  } catch (error) {
    console.error("Error dropping item:", error);
    return { success: false, error: "Failed to drop item" };
  }
};
