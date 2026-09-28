import { NextResponse } from "next/server";
import { PermissionTypes } from "@/app/_types/enums";
import { restatus } from "@/app/_server/actions/checklist/restatus";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS, envelope } from "@/app/_schemas/api/common";
import { BOARD_REFUSED, boardParams, statusesBody, storedBoardSchema } from "@/app/_schemas/api/kanban";
import { boardFor } from "@/app/_utils/kanban/api-board";

export const dynamic = "force-dynamic";

export const PUT = defineRoute(
  {
    id: "setBoardStatuses",
    method: HttpMethod.PUT,
    path: "/kanban/{boardId}/statuses",
    tag: ApiTag.KANBAN,
    summary: "Replace a board's columns",
    description: "Send the whole column list. Cards in a column you leave out move to the lowest-order column and get a history entry. Needs edit permission.",
    params: boardParams,
    body: statusesBody,
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
    const { board, refused } = await boardFor(request, params.boardId, user.username, { permission: PermissionTypes.EDIT });
    if (refused) return refused;

    const result = await restatus(user, board.uuid, () => body.statuses);
    if (result.error) return refuse(result.error, 400);

    return NextResponse.json({ success: true, data: result.data });
  },
);
