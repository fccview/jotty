"use server";

import { Checklist, Result } from "@/app/_types";
import { BoardAgents, PinnedSpec } from "@/app/_types/agents";
import { getFormData } from "@/app/_utils/global-utils";
import { sessionActor } from "@/app/_server/actions/lib/actor";
import { canReach } from "@/app/_server/actions/share/queries";
import { getListById } from "@/app/_server/actions/checklist/queries";
import { ItemTypes, PermissionTypes } from "@/app/_types/enums";
import { agentsOf, assignAgent } from "./agents";
import { pinSpec } from "./spec-pin";

export const assignKanbanAgent = async (formData: FormData): Promise<Result<Checklist>> => {
  const { uuid, itemId, agent } = getFormData(formData, ["uuid", "itemId", "agent"]);

  const actor = await sessionActor();
  if ("error" in actor) return { success: false, error: actor.error };

  return assignAgent(actor, uuid, itemId, agent);
};

export const setKanbanSpec = async (formData: FormData): Promise<Result<PinnedSpec>> => {
  const { uuid, noteId } = getFormData(formData, ["uuid", "noteId"]);

  const actor = await sessionActor();
  if ("error" in actor) return { success: false, error: actor.error };

  return pinSpec(actor, uuid, noteId);
};

export const getBoardAgents = async (uuid: string): Promise<Result<BoardAgents>> => {
  try {
    const actor = await sessionActor();
    if ("error" in actor) return { success: false, error: actor.error };

    const allowed = await canReach(uuid, ItemTypes.CHECKLIST, actor.username, PermissionTypes.READ);
    const board = allowed ? await getListById(uuid, actor.username) : undefined;
    if (!board) return { success: false, error: "Permission denied" };

    return { success: true, data: await agentsOf(board, actor.username) };
  } catch (error) {
    console.error("Error reading board agents:", error);
    return { success: false, error: "Failed to read board agents" };
  }
};
