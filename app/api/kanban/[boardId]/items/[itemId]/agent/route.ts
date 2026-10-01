import { agentWarning, assignAgent } from "@/app/_server/actions/kanban/agents";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import { BOARD_REFUSED, cardParams } from "@/app/_schemas/api/kanban";
import { findItem } from "@/app/_utils/item-tree-utils";
import { agentChangedSchema, cardAgentBody } from "@/app/_schemas/api/agents";
import { cardFor, cardChanged } from "@/app/_utils/kanban/api-board";
import { PermissionTypes } from "@/app/_types/enums";

export const dynamic = "force-dynamic";

export const PUT = defineRoute(
  {
    id: "assignAgent",
    method: HttpMethod.PUT,
    path: "/kanban/{boardId}/items/{itemId}/agent",
    tag: ApiTag.KANBAN,
    summary: "Set a card's virtual agent",
    description: "An agent is a label for whoever works the card, not a user, so nobody is notified and the human assignee stays as it is. The id is lowercased and can be any name, listed in the spec's Agents section or not. An empty or missing agent clears it. Needs edit permission.",
    params: cardParams,
    body: cardAgentBody,
    responses: {
      200: { description: "The board after the change", schema: agentChangedSchema },
      400: BOARD_REFUSED,
      401: ERRORS[401],
      403: ERRORS[403],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ request, user, params, body }) => {
    const { board, card, refused } = await cardFor(request, params.boardId, user.username, params.itemId, PermissionTypes.EDIT);
    if (refused) return refused;

    const result = await assignAgent(user, board.uuid, card.id, body.agent);
    if (!result.success) return refuse(result.error || "Failed to assign agent", 400);

    const agent = result.data && findItem(result.data.items, card.id)?.agent;
    return cardChanged(result.data, card.id, await agentWarning(board, card.id, agent, user.username));
  },
);
