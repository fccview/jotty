import { NextResponse } from "next/server";
import { PermissionTypes } from "@/app/_types/enums";
import { dealCards } from "@/app/_server/actions/kanban/dealer";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import { BOARD_REFUSED, boardParams, cardBatchBody, cardsCreatedSchema } from "@/app/_schemas/api/kanban";
import { boardFor } from "@/app/_utils/kanban/api-board";

export const dynamic = "force-dynamic";

export const POST = defineRoute(
  {
    id: "createBoardItems",
    method: HttpMethod.POST,
    path: "/kanban/{boardId}/items/batch",
    tag: ApiTag.KANBAN,
    summary: "Add or update many cards at once",
    description: "Takes the same fields as createBoardItem for each card and saves the board once. New cards land together at the top or bottom, as position says or the key owner's insertion setting when it's left out, and keep the order they were sent in. A card whose externalId is already on the board updates that card instead, so re-running an import doesn't duplicate anything. Nothing is saved when any card is refused. Needs edit permission.",
    params: boardParams,
    body: cardBatchBody,
    responses: {
      200: { description: "The cards in the order they were sent", schema: cardsCreatedSchema },
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

    const result = await dealCards(user, board.uuid, body.cards, body.position);
    if (!result.success || !result.data) {
      return refuse(result.error || "Failed to create items", 400);
    }

    const updated = result.data.filter((dealt) => dealt.updated).length;
    return NextResponse.json({
      success: true,
      data: result.data.map((dealt) => dealt.card),
      created: result.data.length - updated,
      updated,
    });
  },
);
