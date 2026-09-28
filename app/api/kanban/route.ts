import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserChecklists } from "@/app/_server/actions/checklist/queries";
import { makeList } from "@/app/_server/actions/checklist/creator";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS, envelope, page, totalField } from "@/app/_schemas/api/common";
import { boardCreateBody, boardListQuery, boardSchema } from "@/app/_schemas/api/kanban";
import { ChecklistsTypes, isKanbanType } from "@/app/_types/enums";
import { Checklist, Result } from "@/app/_types";
import { transformBoard } from "@/app/_utils/kanban/api-transforms";

export const dynamic = "force-dynamic";

export const GET = defineRoute(
  {
    id: "listBoards",
    method: HttpMethod.GET,
    path: "/kanban",
    tag: ApiTag.KANBAN,
    summary: "List Kanban boards",
    description: "Boards the API key owner owns. They also appear in listChecklists as type kanban, but these board routes are the ones that understand cards and statuses. Boards shared with them are left out, but GET /kanban/{boardId} returns them. Use view=summary with limit and offset to page through them with card counts per status instead of cards.",
    query: boardListQuery,
    responses: {
      200: { description: "Boards", schema: z.object({ boards: z.array(boardSchema), total: totalField }) },
      401: ERRORS[401],
      500: ERRORS[500],
    },
  },
  async ({ user, query }) => {
    const lists = (await getUserChecklists({ username: user.username })) as Result<Checklist[]>;
    if (!lists.success || !lists.data) {
      return refuse(lists.error || "Failed to fetch boards", 500);
    }

    const needle = query.q?.toLowerCase();
    const boards = lists.data.filter(
      (list) =>
        list.owner === user.username &&
        isKanbanType(list.type) &&
        (!query.category || list.category === query.category) &&
        (!query.status || list.items.some((item) => item.status === query.status)) &&
        (!needle ||
          list.title?.toLowerCase().includes(needle) ||
          list.items.some((item) => item.text.toLowerCase().includes(needle))),
    );

    return NextResponse.json({
      boards: page(boards, query).map((list) => transformBoard(list, query.view)),
      total: boards.length,
    });
  },
);

export const POST = defineRoute(
  {
    id: "createBoard",
    method: HttpMethod.POST,
    path: "/kanban",
    tag: ApiTag.KANBAN,
    summary: "Create a Kanban board",
    description: "Needs create permission on the target folder, which a shared folder may not grant.",
    body: boardCreateBody,
    responses: {
      200: { description: "Created board", schema: envelope(boardSchema) },
      400: ERRORS[400],
      401: ERRORS[401],
      500: ERRORS[500],
    },
  },
  async ({ user, body }) => {
    const formData = new FormData();
    formData.append("title", body.title);
    formData.append("category", body.category);
    formData.append("type", ChecklistsTypes.KANBAN);

    const result = await makeList(user, formData, body.statuses);
    if (result.error || !result.data) {
      console.error("Create board error:", result.error);
      return refuse(result.error || "Failed to create board", 400);
    }

    return NextResponse.json({ success: true, data: transformBoard(result.data) });
  },
);
