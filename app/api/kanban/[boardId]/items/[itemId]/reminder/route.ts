import { NextResponse } from "next/server";
import { PermissionTypes } from "@/app/_types/enums";
import { remindItem } from "@/app/_server/actions/kanban/tweaker";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS, envelope, okSchema } from "@/app/_schemas/api/common";
import { BOARD_REFUSED, cardParams, cardReminderBody, storedBoardSchema } from "@/app/_schemas/api/kanban";
import { boardFor } from "@/app/_utils/kanban/api-board";

export const dynamic = "force-dynamic";

export const PUT = defineRoute(
  {
    id: "setBoardItemReminder",
    method: HttpMethod.PUT,
    path: "/kanban/{boardId}/items/{itemId}/reminder",
    tag: ApiTag.KANBAN,
    summary: "Set a card reminder",
    description: "Replaces any existing reminder and re-arms it to fire once at the new time. Needs edit permission.",
    params: cardParams,
    body: cardReminderBody,
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

    const result = await remindItem(user, board.uuid, params.itemId, JSON.stringify({ datetime: body.datetime }));
    if (result.error) return refuse(result.error, 400);

    return NextResponse.json({ success: true, data: result.data });
  },
);

export const DELETE = defineRoute(
  {
    id: "clearBoardItemReminder",
    method: HttpMethod.DELETE,
    path: "/kanban/{boardId}/items/{itemId}/reminder",
    tag: ApiTag.KANBAN,
    summary: "Clear a card reminder",
    description: "Needs edit permission.",
    params: cardParams,
    responses: {
      200: { description: "Cleared", schema: okSchema },
      400: BOARD_REFUSED,
      401: ERRORS[401],
      403: ERRORS[403],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ request, user, params }) => {
    const { board, refused } = await boardFor(request, params.boardId, user.username, { permission: PermissionTypes.EDIT, itemId: params.itemId });
    if (refused) return refused;

    const result = await remindItem(user, board.uuid, params.itemId, "");
    if (result.error) return refuse(result.error, 400);

    return NextResponse.json({ success: true });
  },
);
