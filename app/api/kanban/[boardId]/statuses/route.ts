import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { getListById, updateChecklistStatuses } from "@/app/_server/actions/checklist";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest, props: { params: Promise<{ boardId: string }> }) {
  const params = await props.params;
  return withApiAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { statuses } = body;

      if (!statuses || !Array.isArray(statuses)) {
        return NextResponse.json(
          { error: "Statuses array is required" },
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
      formData.append("id", board.id);
      formData.append("statuses", JSON.stringify(statuses));
      formData.append("category", board.category || "Uncategorized");
      formData.append("apiUser", JSON.stringify(user));

      const result = await updateChecklistStatuses(formData);

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
