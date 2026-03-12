import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { getListById } from "@/app/_server/actions/checklist";
import { generateICS, parseItemsForCalendar } from "@/app/_utils/kanban/calendar-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, props: { params: Promise<{ boardId: string }> }) {
  const params = await props.params;
  return withApiAuth(request, async (user) => {
    try {
      const board = await getListById(params.boardId, user.username);
      if (!board) {
        return NextResponse.json({ error: "Board not found" }, { status: 404 });
      }

      if (board.type !== "kanban" && board.type !== "task") {
        return NextResponse.json({ error: "Not a kanban board" }, { status: 400 });
      }

      const accept = request.headers.get("accept") || "";

      if (accept.includes("text/calendar")) {
        const ics = generateICS(board.items, board.title || "Kanban Board");
        return new NextResponse(ics, {
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": `attachment; filename="${board.title || "board"}.ics"`,
          },
        });
      }

      const events = parseItemsForCalendar(board.items);
      return NextResponse.json({ events });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}
