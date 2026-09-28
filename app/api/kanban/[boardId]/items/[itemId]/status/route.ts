import { PermissionTypes } from "@/app/_types/enums";
import { stampStatus } from "@/app/_server/actions/checklist-item/stamper";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import { BOARD_REFUSED, cardParams, cardStatusBody, cardChangedSchema } from "@/app/_schemas/api/kanban";
import { boardFor, cardChanged } from "@/app/_utils/kanban/api-board";

export const dynamic = "force-dynamic";

export const PUT = defineRoute(
  {
    id: "moveBoardItem",
    method: HttpMethod.PUT,
    path: "/kanban/{boardId}/items/{itemId}/status",
    tag: ApiTag.KANBAN,
    summary: "Move a card to another column",
    description: "Records the change in the card's history. Moving into a column with autoComplete marks the card completed. Needs edit permission.",
    params: cardParams,
    body: cardStatusBody,
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

    const formData = new FormData();
    formData.append("uuid", board.uuid);
    formData.append("itemId", params.itemId);
    formData.append("status", body.status);

    const result = await stampStatus(user, formData);
    if (!result.success) return refuse(result.error || "Failed to update status", 400);

    return cardChanged(result.data, params.itemId);
  },
);
