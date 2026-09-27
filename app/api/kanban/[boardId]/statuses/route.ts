import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, listUuid } from "@/app/_utils/api-utils";
import { restatus } from "@/app/_server/actions/checklist/restatus";
import { getListById } from "@/app/_server/actions/checklist/queries";
import { isKanbanType } from "@/app/_types/enums";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ boardId: string }> },
) {
  const params = await props.params;
  return withApiAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { statuses } = body;

      if (!statuses || !Array.isArray(statuses)) {
        return NextResponse.json(
          { error: "Statuses array is required" },
          { status: 400 },
        );
      }

      const uuid = await listUuid(request, params.boardId, user.username);
      const board = uuid ? await getListById(uuid, user.username) : undefined;
      if (!board) {
        return NextResponse.json({ error: "Board not found" }, { status: 404 });
      }

      if (!isKanbanType(board.type)) {
        return NextResponse.json(
          { error: "Not a kanban board" },
          { status: 400 },
        );
      }

      const result = await restatus(user, board.uuid!, () => statuses);

      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, data: result.data });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  });
}
