import { NextResponse } from "next/server";
import { PermissionTypes } from "@/app/_types/enums";
import { dealCards } from "@/app/_server/actions/kanban/dealer";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import { BOARD_REFUSED, boardParams, cardCreateBody, cardCreatedSchema } from "@/app/_schemas/api/kanban";
import { boardFor } from "@/app/_utils/kanban/api-board";

export const dynamic = "force-dynamic";

export const POST = defineRoute(
  {
    id: "createBoardItem",
    method: HttpMethod.POST,
    path: "/kanban/{boardId}/items",
    tag: ApiTag.KANBAN,
    summary: "Add a card to a board",
    description: "Lands at the top or bottom, as position says or the key owner's insertion setting when it's left out. A card created in a column with autoComplete starts completed. When externalId matches a card already on the board, that card is updated instead and updated is true. On a shared board a card without an assignee is assigned to its creator. To add many cards use createBoardItems. Needs edit permission.",
    params: boardParams,
    body: cardCreateBody,
    responses: {
      200: { description: "The new or updated card", schema: cardCreatedSchema },
      400: BOARD_REFUSED,
      401: ERRORS[401],
      403: ERRORS[403],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ request, user, params, body }) => {
    const { board, refused } = await boardFor(request, params.boardId, user.username, { permission: PermissionTypes.EDIT });
    if (refused) return refused;

    const { position, ...draft } = body;
    const result = await dealCards(user, board.uuid, [draft], position);
    const dealt = result.data?.[0];
    if (!result.success || !dealt) {
      return refuse(result.error || "Failed to create item", 400);
    }

    return NextResponse.json({ success: true, data: dealt.card, updated: dealt.updated });
  },
);
