import { revalidatePath } from "next/cache";
import { Checklist, Item, Result, KanbanStatus, SanitisedUser } from "@/app/_types";
import { ItemTypes, Modes, PermissionTypes } from "@/app/_types/enums";
import { DEFAULT_KANBAN_STATUSES } from "@/app/_consts/kanban";
import { serverWriteFile } from "@/app/_server/actions/file";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { reachableFile } from "@/app/_server/actions/share/queries";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { itemLane, runQueued } from "@/app/_server/actions/lib/concurrency";
import { getListById } from "./queries";

export type StatusReshaper = (current?: KanbanStatus[]) => KanbanStatus[];

const _rehome = (
  items: Item[],
  removed: string[],
  fallback: string,
  username: string,
  now: string,
): Item[] =>
  items.map((item) => {
    const children = item.children
      ? _rehome(item.children, removed, fallback, username, now)
      : item.children;

    if (!removed.includes(item.status || "")) {
      return children === item.children ? item : { ...item, children };
    }

    return {
      ...item,
      children,
      status: fallback,
      lastModifiedBy: username,
      lastModifiedAt: now,
      history: [
        ...(item.history || []),
        { status: fallback, timestamp: now, user: username },
      ],
    };
  });

const _restatus = async (
  actor: SanitisedUser,
  uuid: string,
  reshape: StatusReshaper,
): Promise<Result<Checklist>> => {
  try {
    const username = actor?.username;
    if (!username) return { success: false, error: "Not authenticated" };

    const filePath = await reachableFile(
      uuid,
      ItemTypes.CHECKLIST,
      username,
      PermissionTypes.EDIT,
    );
    if (!filePath) return { success: false, error: "Permission denied" };

    const list = await getListById(uuid, username);
    if (!list || !list.id || !list.createdAt) {
      return { success: false, error: "List not found or is malformed" };
    }

    const statuses = reshape(list.statuses);
    const kept = new Set(statuses.map((status) => status.id));
    const removed = (list.statuses || DEFAULT_KANBAN_STATUSES)
      .map((status) => status.id)
      .filter((id) => !kept.has(id));

    const sorted = [...statuses].sort((a, b) => a.order - b.order);
    const fallback = sorted[0]?.id || "todo";
    const now = new Date().toISOString();

    const updatedList: Checklist = {
      ...list,
      items: removed.length
        ? _rehome(list.items, removed, fallback, username, now)
        : list.items,
      statuses,
      updatedAt: now,
    };

    await serverWriteFile(filePath, listToMarkdown(updatedList));

    try {
      revalidatePath("/", "layout");
      revalidatePath(`/checklist/${list.uuid}`);
      if (list.category) {
        revalidatePath(`/category/${list.category}`);
      }
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
      username,
    });

    return { success: true, data: updatedList };
  } catch (error) {
    console.error("Error updating checklist statuses:", error);
    return { success: false, error: "Failed to update checklist statuses" };
  }
};

export const restatus = async (
  actor: SanitisedUser,
  uuid: string,
  reshape: StatusReshaper,
): Promise<Result<Checklist>> =>
  runQueued(itemLane(Modes.CHECKLISTS, uuid), () =>
    _restatus(actor, uuid, reshape),
  );
