import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { getListById } from "@/app/_server/actions/checklist";
import { setKanbanItemReminder } from "@/app/_server/actions/kanban/items";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ boardId: string; itemId: string }> }
) {
  const params = await props.params;
  return withApiAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { datetime } = body;

      if (!datetime) {
        return NextResponse.json(
          { error: "Datetime is required" },
          { status: 400 }
        );
      }

      const board = await getListById(params.boardId, user.username);
      if (!board) {
        return NextResponse.json({ error: "Board not found" }, { status: 404 });
      }

      if (board.type !== "kanban" && board.type !== "task") {
        return NextResponse.json({ error: "Not a kanban board" }, { status: 400 });
      }

      const formData = new FormData();
      formData.append("listId", board.id);
      formData.append("itemId", params.itemId);
      formData.append("reminder", JSON.stringify({ datetime }));
      formData.append("category", board.category || "Uncategorized");

      const result = await setKanbanItemReminder(formData);

      if (result.error) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true, data: result.data });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ boardId: string; itemId: string }> }
) {
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

      const formData = new FormData();
      formData.append("listId", board.id);
      formData.append("itemId", params.itemId);
      formData.append("reminder", "");
      formData.append("category", board.category || "Uncategorized");

      const result = await setKanbanItemReminder(formData);

      if (result.error) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}
