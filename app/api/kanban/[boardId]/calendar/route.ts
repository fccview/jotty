import { NextResponse } from "next/server";
import { z } from "zod";
import { defineRoute } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod, MediaType } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import { boardParams, calendarEventSchema } from "@/app/_schemas/api/kanban";
import { generateICS, parseItemsForCalendar } from "@/app/_utils/kanban/calendar-utils";
import { boardFor } from "@/app/_utils/kanban/api-board";

export const dynamic = "force-dynamic";

const _icsName = (title?: string) => encodeURIComponent(`${title || "board"}.ics`);

export const GET = defineRoute(
  {
    id: "getBoardCalendar",
    method: HttpMethod.GET,
    path: "/kanban/{boardId}/calendar",
    tag: ApiTag.KANBAN,
    summary: "Get a board's cards as calendar events",
    description: "Top-level, unarchived cards with a target date. Send `Accept: text/calendar` to download an .ics file instead of JSON.",
    params: boardParams,
    responses: {
      200: {
        description: "Calendar events, or an iCalendar file when Accept asks for text/calendar",
        schema: z.object({ events: z.array(calendarEventSchema) }),
        alternatives: [{ mediaType: MediaType.CALENDAR }],
      },
      400: { description: "Not a kanban board", schema: ERRORS[400].schema },
      401: ERRORS[401],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ request, user, params }) => {
    const { board, refused } = await boardFor(request, params.boardId, user.username);
    if (refused) return refused;

    if ((request.headers.get("accept") || "").includes(MediaType.CALENDAR)) {
      return new NextResponse(generateICS(board.items, board.title || "Kanban"), {
        headers: {
          "Content-Type": `${MediaType.CALENDAR}; charset=utf-8`,
          "Content-Disposition": `attachment; filename="board.ics"; filename*=UTF-8''${_icsName(board.title)}`,
        },
      });
    }

    return NextResponse.json({ events: parseItemsForCalendar(board.items) });
  },
);
