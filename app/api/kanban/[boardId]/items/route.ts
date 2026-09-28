import { NextResponse } from "next/server";
import { PermissionTypes } from "@/app/_types/enums";
import { addItem } from "@/app/_server/actions/checklist-item/editor";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS, envelope } from "@/app/_schemas/api/common";
import { BOARD_REFUSED, boardParams, cardCreateBody, storedCardSchema } from "@/app/_schemas/api/kanban";
import { boardFor } from "@/app/_utils/kanban/api-board";

export const dynamic = "force-dynamic";

export const POST = defineRoute(
  {
    id: "createBoardItem",
    method: HttpMethod.POST,
    path: "/kanban/{boardId}/items",
    tag: ApiTag.KANBAN,
    summary: "Add a card to a board",
    description: "Lands at the top or bottom depending on the key owner's insertion setting. On a shared board the card is assigned to its creator. Needs edit permission.",
    params: boardParams,
    body: cardCreateBody,
    responses: {
      200: { description: "The new card", schema: envelope(storedCardSchema) },
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

    const formData = new FormData();
    formData.append("text", body.text);
    if (body.status) formData.append("status", body.status);
    if (body.description) formData.append("description", body.description);

    const result = await addItem(user, board, formData);
    if (!result.success || !result.data) {
      return refuse(result.error || "Failed to create item", 400);
    }

    return NextResponse.json({ success: true, data: result.data });
  },
);
