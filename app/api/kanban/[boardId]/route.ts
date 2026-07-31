import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, listUuid } from "@/app/_utils/api-utils";
import {
  getListById,
  updateList,
  deleteList,
} from "@/app/_server/actions/checklist";
import { isKanbanType } from "@/app/_types/enums";
import { transformBoard } from "@/app/_utils/kanban/api-transforms";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ boardId: string }> },
) {
  const params = await props.params;
  return withApiAuth(request, async (user) => {
    try {
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

      return NextResponse.json({ board: transformBoard(board) });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  });
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ boardId: string }> },
) {
  const params = await props.params;
  return withApiAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { title, category } = body;

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
      formData.append("title", title ?? board.title);
      formData.append(
        "category",
        category ?? board.category ?? "Uncategorized",
      );
      formData.append("apiUser", JSON.stringify(user));

      const result = await updateList(formData);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, data: result.data ? transformBoard(result.data) : null });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  });
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ boardId: string }> },
) {
  const params = await props.params;
  return withApiAuth(request, async (user) => {
    try {
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
      formData.append("apiUser", JSON.stringify(user));

      const result = await deleteList(formData);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  });
}
