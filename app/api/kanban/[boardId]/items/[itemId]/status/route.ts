import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, listUuid } from "@/app/_utils/api-utils";
import { getListById } from "@/app/_server/actions/checklist";
import { updateItemStatus } from "@/app/_server/actions/checklist-item";
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
      const { status } = body;

      if (!status) {
        return NextResponse.json(
          { error: "Status is required" },
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

      const formData = new FormData();
      formData.append("uuid", board.uuid!);
      formData.append("itemId", params.itemId);
      formData.append("status", status);
      formData.append("username", user.username);

      const result = await updateItemStatus(formData, user.username);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to update status" },
          { status: 400 },
        );
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
