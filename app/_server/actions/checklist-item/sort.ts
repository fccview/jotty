"use server";

import { revalidatePath } from "next/cache";
import path from "path";
import { serverWriteFile, ensureDir } from "@/app/_server/actions/file";
import { getListById } from "@/app/_server/actions/checklist";
import { getUsername } from "@/app/_server/actions/users";
import { canReach } from "@/app/_server/actions/share/queries";
import { diskPath } from "@/app/_server/actions/share/target";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { sortColumnByPriority } from "@/app/_utils/kanban/board-utils";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { DEFAULT_KANBAN_STATUSES } from "@/app/_consts/kanban";
import { Checklist, Result } from "@/app/_types";
import { ItemTypes, PermissionTypes, Modes } from "@/app/_types/enums";

export const sortColumn = async (
  formData: FormData,
): Promise<Result<Checklist>> => {
  try {
    const uuid = formData.get("uuid") as string;
    const targetStatus = formData.get("targetStatus") as string;

    if (!uuid || !targetStatus) {
      return {
        success: false,
        error: "uuid and targetStatus are required",
      };
    }

    const username = await getUsername();
    const list = await getListById(uuid);
    if (!list) {
      return { success: false, error: "List not found" };
    }

    const canEdit = await canReach(
      list.uuid!,
      ItemTypes.CHECKLIST,
      username,
      PermissionTypes.EDIT,
    );
    if (!canEdit) {
      return { success: false, error: "Permission denied" };
    }

    const statuses =
      list.statuses && list.statuses.length > 0
        ? list.statuses
        : DEFAULT_KANBAN_STATUSES;
    const isValidStatus = statuses.some((s) => s.id === targetStatus);
    if (!isValidStatus) {
      return { success: false, error: "Invalid target status" };
    }

    const updatedList = sortColumnByPriority(list, targetStatus);

    const filePath = await diskPath(Modes.CHECKLISTS, username, list);
    await ensureDir(path.dirname(filePath));
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
    console.error("Error sorting column:", error);
    return { success: false, error: "Failed to sort column" };
  }
};