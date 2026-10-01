import { revalidatePath } from "next/cache";
import { Result, SanitisedUser } from "@/app/_types";
import { PinnedSpec } from "@/app/_types/agents";
import { ItemTypes, Modes, PermissionTypes, isKanbanType } from "@/app/_types/enums";
import { INVALID_SPEC_NOTE, SPEC_ENCRYPTED, SPEC_MISSING, SpecStatus } from "@/app/_consts/agents";
import { isUuid } from "@/app/_consts/identity";
import { serverWriteFile } from "@/app/_server/actions/file";
import { isLockedUuid, reachableFile } from "@/app/_server/actions/share/queries";
import { getListById } from "@/app/_server/actions/checklist/queries";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { itemLane, runQueued } from "@/app/_server/actions/lib/concurrency";
import { failedWith, lockedNotice } from "@/app/_server/actions/lib/read-only-message";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { NOT_A_BOARD } from "@/app/_utils/kanban/api-board";
import { readSpec } from "./spec";

const PIN_REFUSALS: Partial<Record<SpecStatus, string>> = {
  [SpecStatus.MISSING]: SPEC_MISSING,
  [SpecStatus.ENCRYPTED]: SPEC_ENCRYPTED,
};

const _pinSpec = async (
  username: string,
  uuid: string,
  noteId: string,
): Promise<Result<PinnedSpec>> => {
  const filePath = await reachableFile(uuid, ItemTypes.CHECKLIST, username, PermissionTypes.EDIT);
  if (!filePath) return { success: false, error: "Permission denied" };

  const list = await getListById(uuid, username);
  if (!list) return { success: false, error: "List not found" };
  if (!isKanbanType(list.type)) return { success: false, error: NOT_A_BOARD };
  if (noteId && !isUuid(noteId)) return { success: false, error: INVALID_SPEC_NOTE };
  if (noteId && (await isLockedUuid(ItemTypes.NOTE, noteId))) {
    return { success: false, error: await lockedNotice() };
  }

  const spec = await readSpec(noteId || undefined, username);
  const refusal = PIN_REFUSALS[spec.status];
  if (refusal) return { success: false, error: refusal };

  await serverWriteFile(
    filePath,
    listToMarkdown({ ...list, specNote: noteId || undefined, updatedAt: new Date().toISOString() }),
  );

  await broadcast({ type: "checklist", action: "updated", entityId: list.uuid, username });

  try {
    revalidatePath("/");
  } catch (error) {
    console.warn("Cache revalidation failed, but the spec was pinned:", error);
  }

  return {
    success: true,
    data: { boardId: list.uuid, specNote: noteId || null, status: spec.status, agents: spec.agents },
  };
};

export const pinSpec = async (
  actor: SanitisedUser,
  uuid: string,
  raw: string | null | undefined,
): Promise<Result<PinnedSpec>> => {
  const username = actor?.username;
  if (!username) return { success: false, error: "Not authenticated" };

  try {
    return await runQueued(itemLane(Modes.CHECKLISTS, uuid), () =>
      _pinSpec(username, uuid, (raw ?? "").trim()),
    );
  } catch (error) {
    console.error("Error pinning the board spec:", error);
    return { success: false, error: await failedWith(error, "Failed to link the spec note") };
  }
};
