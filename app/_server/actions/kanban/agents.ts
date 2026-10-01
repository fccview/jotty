import { Checklist, Result, SanitisedUser } from "@/app/_types";
import { ItemTypes, PermissionTypes, isKanbanType } from "@/app/_types/enums";
import {
  SpecSections,
  SpecStatus,
  agentRefusal,
  normalAgent,
  otherTaskAgent,
  unlistedAgent,
} from "@/app/_consts/agents";
import { specTasks, taskFor } from "@/app/_utils/spec/roster";
import { readSpec } from "./spec";
import { canReach } from "@/app/_server/actions/share/queries";
import { findItem } from "@/app/_utils/item-tree-utils";
import { CARD_NOT_FOUND, NOT_A_BOARD } from "@/app/_utils/kanban/api-board";
import { ListVet, tweakItem } from "./tweaker";

const _cardVet =
  (itemId: string): ListVet =>
  async (list) => {
    if (!isKanbanType(list.type)) return NOT_A_BOARD;
    return findItem(list.items, itemId) ? null : CARD_NOT_FOUND;
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
    const refusal = agentRefusal(agent);
    if (refusal) return { success: false, error: refusal };

    return await tweakItem(actor, uuid, itemId, { agent: agent || undefined }, _cardVet(itemId));
  } catch (error) {
    console.error("Error assigning agent:", error);
    return { success: false, error: "Failed to assign agent" };
  }
};

export const agentWarning = async (
  board: Checklist,
  cardId: string,
  agent: string | undefined,
  username: string,
): Promise<string | undefined> => {
  if (!agent || !board.specNote) return undefined;

  const spec = await readSpec(board.specNote, username);
  if (spec.status !== SpecStatus.LINKED) return undefined;
  if (!spec.agents.some((known) => known.id === agent)) return unlistedAgent(agent);

  const named = taskFor(specTasks(spec.sections[SpecSections.TASKS]), board.uuid, cardId)?.agent;
  return named && named !== agent ? otherTaskAgent(agent, named) : undefined;
};
