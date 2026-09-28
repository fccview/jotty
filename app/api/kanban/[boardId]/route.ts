import { NextResponse } from "next/server";
import { PermissionTypes } from "@/app/_types/enums";
import { z } from "zod";
import { dropList, editList } from "@/app/_server/actions/checklist/editor";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS, okSchema } from "@/app/_schemas/api/common";
import { BOARD_REFUSED, boardParams, boardSchema, boardUpdateBody } from "@/app/_schemas/api/kanban";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { transformBoard } from "@/app/_utils/kanban/api-transforms";
import { boardFor } from "@/app/_utils/kanban/api-board";

export const dynamic = "force-dynamic";

export const GET = defineRoute(
  {
    id: "getBoard",
    method: HttpMethod.GET,
    path: "/kanban/{boardId}",
    tag: ApiTag.KANBAN,
    summary: "Get a Kanban board",
    description: "Also returns boards shared with the API key owner.",
    params: boardParams,
    responses: {
      200: { description: "The board", schema: z.object({ board: boardSchema }) },
      400: { description: "Not a kanban board", schema: ERRORS[400].schema },
      401: ERRORS[401],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ request, user, params }) => {
    const { board, refused } = await boardFor(request, params.boardId, user.username);
    if (refused) return refused;

    return NextResponse.json({ board: transformBoard(board) });
  },
);

export const PUT = defineRoute(
  {
    id: "updateBoard",
    method: HttpMethod.PUT,
    path: "/kanban/{boardId}",
    tag: ApiTag.KANBAN,
    summary: "Rename or move a Kanban board",
    description: "Fields left out keep their current value. Needs edit permission, and moving to another folder also needs delete on the board. A refused change answers 400.",
    params: boardParams,
    body: boardUpdateBody,
    responses: {
      200: { description: "Updated board", schema: z.object({ success: z.literal(true), data: boardSchema.nullable() }) },
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
    formData.append("uuid", board.uuid);
    formData.append("title", body.title ?? board.title);
    formData.append("category", body.category ?? board.category ?? UNCATEGORIZED);

    const result = await editList(user, formData);
    if (result.error) return refuse(result.error, 400);

    return NextResponse.json({
      success: true,
      data: result.data ? transformBoard(result.data) : null,
    });
  },
);

export const DELETE = defineRoute(
  {
    id: "deleteBoard",
    method: HttpMethod.DELETE,
    path: "/kanban/{boardId}",
    tag: ApiTag.KANBAN,
    summary: "Delete a Kanban board",
    description: "Needs delete permission on the board. Edit alone is not enough. A refused delete answers 400.",
    params: boardParams,
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
    const { board, refused } = await boardFor(request, params.boardId, user.username, { permission: PermissionTypes.DELETE });
    if (refused) return refused;

    const formData = new FormData();
    formData.append("uuid", board.uuid);

    const result = await dropList(user, formData);
    if (result.error) return refuse(result.error, 400);

    return NextResponse.json({ success: true });
  },
);
