import { NextResponse } from "next/server";
import { PermissionTypes } from "@/app/_types/enums";
import { removeItem } from "@/app/_server/actions/checklist-item/remover";
import { editItem } from "@/app/_server/actions/checklist-item/editor";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS, okSchema } from "@/app/_schemas/api/common";
import { BOARD_REFUSED, cardParams, cardUpdateBody, cardChangedSchema } from "@/app/_schemas/api/kanban";
import { cardFor, cardChanged } from "@/app/_utils/kanban/api-board";

export const dynamic = "force-dynamic";

export const PUT = defineRoute(
  {
    id: "updateBoardItem",
    method: HttpMethod.PUT,
    path: "/kanban/{boardId}/items/{itemId}",
    tag: ApiTag.KANBAN,
    summary: "Update a card",
    description: "Fields left out keep their current value. Assigning someone else notifies them. Use the status route to move a card between columns. Needs edit permission.",
    params: cardParams,
    body: cardUpdateBody,
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
    const { board, card, refused } = await cardFor(request, params.boardId, user.username, params.itemId, PermissionTypes.EDIT);
    if (refused) return refused;

    const formData = new FormData();
    formData.append("itemId", card.id);
    if (body.text !== undefined) formData.append("text", body.text);
    if (body.priority !== undefined) formData.append("priority", body.priority);
    if (body.score !== undefined) formData.append("score", String(body.score));
    if (body.assignee !== undefined) formData.append("assignee", body.assignee);
    if (body.reminder !== undefined) formData.append("reminder", JSON.stringify(body.reminder));

    const result = await editItem(user, board, formData);
    if (!result.success) return refuse(result.error || "Failed to update item", 400);

    return cardChanged(result.data, card.id);
  },
);

export const DELETE = defineRoute(
  {
    id: "deleteBoardItem",
    method: HttpMethod.DELETE,
    path: "/kanban/{boardId}/items/{itemId}",
    tag: ApiTag.KANBAN,
    summary: "Delete a card",
    description: "Removes the card and its sub-cards. Needs delete permission on the board.",
    params: cardParams,
    responses: {
      200: { description: "Deleted", schema: okSchema },
      400: BOARD_REFUSED,
      401: ERRORS[401],
      403: ERRORS[403],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ request, user, params }) => {
    const { board, card, refused } = await cardFor(request, params.boardId, user.username, params.itemId, PermissionTypes.DELETE);
    if (refused) return refused;

    const result = await removeItem(user, board.uuid, card.id);
    if (!result.success) return refuse(result.error || "Failed to delete item", 400);

    return NextResponse.json({ success: true });
  },
);
