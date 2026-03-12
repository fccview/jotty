import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { getListById } from "@/app/_server/actions/checklist";
import { createItem } from "@/app/_server/actions/checklist-item";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, props: { params: Promise<{ boardId: string }> }) {
  const params = await props.params;
  return withApiAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { text, status, description } = body;

      if (!text) {
        return NextResponse.json(
          { error: "Text is required" },
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
      formData.append("text", text);
      formData.append("category", board.category || "Uncategorized");
      if (status) formData.append("status", status);
      if (description) formData.append("description", description);

      const result = await createItem(board, formData, user.username);

      if (!result.success || !result.data) {
        return NextResponse.json(
          { error: result.error || "Failed to create item" },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true, data: result.data });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Internal server error" },
        { status: 500 }
      );
    }
  });
}
