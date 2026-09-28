import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserChecklists } from "@/app/_server/actions/checklist/queries";
import { makeList } from "@/app/_server/actions/checklist/creator";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS, envelope, page, totalField } from "@/app/_schemas/api/common";
import { toApiChecklist } from "@/app/_utils/api-checklist";
import { checklistCreateBody, checklistListQuery, checklistSchema } from "@/app/_schemas/api/checklists";
import { ChecklistsTypes } from "@/app/_types/enums";
import { Checklist, Result } from "@/app/_types";
import { UNCATEGORIZED } from "@/app/_consts/notes";

export const dynamic = "force-dynamic";

export const GET = defineRoute(
  {
    id: "listChecklists",
    method: HttpMethod.GET,
    path: "/checklists",
    tag: ApiTag.CHECKLISTS,
    summary: "List checklists",
    description: "Checklists the API key owner owns or that were shared with them, items included. Jotty stores Kanban boards as checklists of type kanban, so they show up here too. Pass type=simple for plain lists only, and use listBoards and getBoard for a board's cards. Use view=summary with limit and offset to page through them with item counts instead of items.",
    query: checklistListQuery,
    responses: {
      200: { description: "Checklists", schema: z.object({ checklists: z.array(checklistSchema), total: totalField }) },
      401: ERRORS[401],
      500: ERRORS[500],
    },
  },
  async ({ user, query }) => {
    const lists = (await getUserChecklists({ username: user.username })) as Result<Checklist[]>;
    if (!lists.success || !lists.data) {
      return refuse(lists.error || "Failed to fetch checklists", 500);
    }

    const needle = query.q?.toLowerCase();
    const matches = lists.data.filter(
      (list) =>
        (list.owner === user.username || list.isShared) &&
        (!query.category || list.category === query.category) &&
        (!query.type || list.type === query.type) &&
        (!needle ||
          list.title?.toLowerCase().includes(needle) ||
          list.items.some((item) => item.text.toLowerCase().includes(needle))),
    );

    return NextResponse.json({
      checklists: page(matches, query).map((list) => toApiChecklist(list, query.view)),
      total: matches.length,
    });
  },
);

export const POST = defineRoute(
  {
    id: "createChecklist",
    method: HttpMethod.POST,
    path: "/checklists",
    tag: ApiTag.CHECKLISTS,
    summary: "Create a checklist",
    description: "Needs create permission on the target folder when it belongs to someone else.",
    body: checklistCreateBody,
    responses: {
      200: { description: "Created checklist", schema: envelope(checklistSchema) },
      400: ERRORS[400],
      401: ERRORS[401],
      500: ERRORS[500],
    },
  },
  async ({ user, body }) => {
    const formData = new FormData();
    formData.append("title", body.title);
    formData.append("category", body.category);
    formData.append("type", body.type);

    const result = await makeList(user, formData);
    if (result.error || !result.data) {
      console.error("Create list error:", result.error);
      return refuse(result.error || "Failed to create checklist", 400);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: result.data.uuid,
        title: result.data.title,
        category: result.data.category || UNCATEGORIZED,
        type: result.data.type || ChecklistsTypes.SIMPLE,
        items: [],
        createdAt: result.data.createdAt,
        updatedAt: result.data.updatedAt,
      },
    });
  },
);
