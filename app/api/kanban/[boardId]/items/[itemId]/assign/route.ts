import { NextResponse } from "next/server";
import { assignItem } from "@/app/_server/actions/kanban/tweaker";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS, envelope } from "@/app/_schemas/api/common";
import { BOARD_REFUSED, cardAssignBody, cardParams, storedBoardSchema } from "@/app/_schemas/api/kanban";
import { boardFor } from "@/app/_utils/kanban/api-board";
import { PermissionTypes } from "@/app/_types/enums";

export const dynamic = "force-dynamic";

export const PUT = defineRoute(
  {
    id: "assignBoardItem",
    method: HttpMethod.PUT,
    path: "/kanban/{boardId}/items/{itemId}/assign",
    tag: ApiTag.KANBAN,
    summary: "Assign a card",
    description: "The assignee has to be a user who can see the board. Assigning someone other than the key owner sends them a notification. An empty or missing assignee clears it. Needs edit permission.",
    params: cardParams,
    body: cardAssignBody,
    responses: {
      200: { description: "The board after the change", schema: envelope(storedBoardSchema) },
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

    const result = await assignItem(user, board.uuid, params.itemId, body.assignee || "");
    if (result.error) return refuse(result.error, 400);

    return NextResponse.json({ success: true, data: result.data });
  },
);
