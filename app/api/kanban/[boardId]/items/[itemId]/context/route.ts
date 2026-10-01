import { NextResponse } from "next/server";
import { taskContext } from "@/app/_server/actions/kanban/task-context";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import { cardParams } from "@/app/_schemas/api/kanban";
import { taskContextSchema } from "@/app/_schemas/api/agents";
import { CARD_NOT_FOUND, cardFor } from "@/app/_utils/kanban/api-board";

export const dynamic = "force-dynamic";

export const GET = defineRoute(
  {
    id: "getTaskContext",
    method: HttpMethod.GET,
    path: "/kanban/{boardId}/items/{itemId}/context",
    tag: ApiTag.KANBAN,
    summary: "Everything needed to work on one card",
    description: "The card, its board columns, its agent, its dependencies and the parts of the pinned spec note that matter for it: goal, acceptance criteria, decisions, references, its task line, and the progress, blockers and handover entries mentioning the card or its agent. Long parts are cut and truncated says so. A spec note that is gone or that you can't read reports missing, and an encrypted one reports encrypted with nothing from inside it.",
    params: cardParams,
    responses: {
      200: { description: "The card's context", schema: taskContextSchema },
      400: { description: "Not a kanban board", schema: ERRORS[400].schema },
      401: ERRORS[401],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ request, user, params }) => {
    const { board, card, refused } = await cardFor(request, params.boardId, user.username, params.itemId);
    if (refused) return refused;

    const context = await taskContext(user.username, board, card.id);
    if (!context) return refuse(CARD_NOT_FOUND, 404);

    return NextResponse.json({ success: true, data: context });
  },
);
