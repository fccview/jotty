import { NextResponse } from "next/server";
import { pinSpec } from "@/app/_server/actions/kanban/spec-pin";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import { BOARD_REFUSED, boardParams } from "@/app/_schemas/api/kanban";
import { boardSpecBody, pinnedSpecSchema } from "@/app/_schemas/api/agents";
import { boardFor } from "@/app/_utils/kanban/api-board";
import { PermissionTypes } from "@/app/_types/enums";

export const dynamic = "force-dynamic";

export const PUT = defineRoute(
  {
    id: "setBoardSpec",
    method: HttpMethod.PUT,
    path: "/kanban/{boardId}/spec",
    tag: ApiTag.KANBAN,
    summary: "Pin a spec note to a board",
    description: "The spec note holds the plan for the board: goal, agents, tasks, decisions and handover. A board has one spec at most. Needs edit permission on the board and read permission on the note, and encrypted notes are refused. An empty or missing noteId unpins it, leaving the note alone.",
    params: boardParams,
    body: boardSpecBody,
    responses: {
      200: { description: "The pinned spec and the agents it lists", schema: pinnedSpecSchema },
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

    const result = await pinSpec(user, board.uuid, body.noteId);
    if (!result.success) return refuse(result.error || "Failed to link the spec note", 400);

    return NextResponse.json({ success: true, data: result.data });
  },
);
