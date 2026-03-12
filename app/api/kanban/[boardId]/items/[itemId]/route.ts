import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { getListById } from "@/app/_server/actions/checklist";
import { updateItem, deleteItem } from "@/app/_server/actions/checklist-item";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ boardId: string; itemId: string }> }
) {
  const params = await props.params;
  return withApiAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { text, priority, score, assignee, reminder } = body;

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
      formData.append("category", board.category || "Uncategorized");
      if (text !== undefined) formData.append("text", text);
      if (priority !== undefined) formData.append("priority", priority);
      if (score !== undefined) formData.append("score", String(score));
      if (assignee !== undefined) formData.append("assignee", assignee);
      if (reminder !== undefined) formData.append("reminder", JSON.stringify(reminder));

      const result = await updateItem(board, formData, user.username);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to update item" },
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
      formData.append("category", board.category || "Uncategorized");

      const result = await deleteItem(formData);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to delete item" },
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
