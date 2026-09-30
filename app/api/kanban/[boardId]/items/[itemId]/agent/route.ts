import { assignAgent } from "@/app/_server/actions/kanban/agents";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import { BOARD_REFUSED, cardChangedSchema, cardParams } from "@/app/_schemas/api/kanban";
import { cardAgentBody } from "@/app/_schemas/api/agents";
import { boardFor, cardChanged } from "@/app/_utils/kanban/api-board";
import { PermissionTypes } from "@/app/_types/enums";

export const dynamic = "force-dynamic";

export const PUT = defineRoute(
  {
    id: "assignAgent",
    method: HttpMethod.PUT,
    path: "/kanban/{boardId}/items/{itemId}/agent",
    tag: ApiTag.KANBAN,
    summary: "Set a card's virtual agent",
    description: "An agent is a label for whoever works the card, not a user, so nobody is notified and the human assignee stays as it is. The id is lowercased and has to be listed in the Agents section of the note pinned with setBoardSpec. An empty or missing agent clears it. Needs edit permission.",
    params: cardParams,
    body: cardAgentBody,
    responses: {
      200: { description: "The board after the change", schema: cardChangedSchema },
      400: BOARD_REFUSED,
      401: ERRORS[401],
      403: ERRORS[403],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ request, user, params, body }) => {
    const { board, refused } = await boardFor(request, params.boardId, user.username, { permission: PermissionTypes.EDIT, itemId: params.itemId });
    if (refused) return refused;

    const result = await assignAgent(user, board.uuid, params.itemId, body.agent);
    if (!result.success) return refuse(result.error || "Failed to assign agent", 400);

    return cardChanged(result.data, params.itemId);
  },
);
