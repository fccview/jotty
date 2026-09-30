import { Checklist, Result, SanitisedUser } from "@/app/_types";
import { BoardAgents } from "@/app/_types/agents";
import { ItemTypes, PermissionTypes, isKanbanType } from "@/app/_types/enums";
import {
  AGENT_NOT_INDEXED,
  INVALID_AGENT,
  NO_SPEC,
  SPEC_ENCRYPTED,
  SPEC_MISSING,
  SpecStatus,
  isAgentId,
  normalAgent,
} from "@/app/_consts/agents";
import { canReach } from "@/app/_server/actions/share/queries";
import { findItem } from "@/app/_utils/item-tree-utils";
import { CARD_NOT_FOUND, NOT_A_BOARD } from "@/app/_utils/kanban/api-board";
import { ListVet, tweakItem } from "./tweaker";
import { readSpec } from "./spec";

export const SPEC_REFUSALS: Partial<Record<SpecStatus, string>> = {
  [SpecStatus.NONE]: NO_SPEC,
  [SpecStatus.MISSING]: SPEC_MISSING,
  [SpecStatus.ENCRYPTED]: SPEC_ENCRYPTED,
};

export const agentsOf = async (list: Checklist, username: string): Promise<BoardAgents> => {
  const spec = await readSpec(list.specNote, username);
  return { specNote: list.specNote ?? null, status: spec.status, agents: spec.agents };
};

const _agentVet =
  (agent: string, itemId: string, username: string): ListVet =>
  async (list) => {
    if (!isKanbanType(list.type)) return NOT_A_BOARD;
    if (!findItem(list.items, itemId)) return CARD_NOT_FOUND;
    if (!agent) return null;

    const spec = await readSpec(list.specNote, username);
    const refusal = SPEC_REFUSALS[spec.status];
    if (refusal) return refusal;

    return spec.agents.some((known) => known.id === agent) ? null : AGENT_NOT_INDEXED;
  };

export const assignAgent = async (
  actor: SanitisedUser,
  uuid: string,
  itemId: string,
  raw: string | null | undefined,
): Promise<Result<Checklist>> => {
  try {
    const username = actor?.username;
    if (!username) return { success: false, error: "Not authenticated" };

    if (!(await canReach(uuid, ItemTypes.CHECKLIST, username, PermissionTypes.EDIT))) {
      return { success: false, error: "Permission denied" };
    }

    const agent = normalAgent(raw);
    if (agent && !isAgentId(agent)) return { success: false, error: INVALID_AGENT };

    return await tweakItem(
      actor,
      uuid,
      itemId,
      { agent: agent || undefined },
      _agentVet(agent, itemId, username),
    );
  } catch (error) {
    console.error("Error assigning agent:", error);
    return { success: false, error: "Failed to assign agent" };
  }
};
