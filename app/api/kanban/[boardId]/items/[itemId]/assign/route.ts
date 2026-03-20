import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { getListById } from "@/app/_server/actions/checklist";
import { assignKanbanItem } from "@/app/_server/actions/kanban/items";
import { isKanbanType } from "@/app/_types/enums";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ boardId: string; itemId: string }> },
) {
  const params = await props.params;
  return withApiAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { assignee } = body;

      const board = await getListById(params.boardId, user.username);
      if (!board) {
        return NextResponse.json({ error: "Board not found" }, { status: 404 });
      }

      if (!isKanbanType(board.type)) {
        return NextResponse.json(
          { error: "Not a kanban board" },
          { status: 400 },
        );
      }

      const formData = new FormData();
      formData.append("listId", board.id);
      formData.append("itemId", params.itemId);
      formData.append("assignee", assignee || "");
      formData.append("category", board.category || "Uncategorized");

      const result = await assignKanbanItem(formData);

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
