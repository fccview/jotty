import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { getListById, updateList, deleteList } from "@/app/_server/actions/checklist";
import { TaskStatus } from "@/app/_types/enums";

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

      const transformItem = (item: any, index: number): any => {
        const baseItem: any = {
          id: item.id,
          index,
          text: item.text,
          status: item.status || TaskStatus.TODO,
          completed: item.completed,
          priority: item.priority,
          score: item.score,
          assignee: item.assignee,
          reminder: item.reminder,
        };

        if (item.children && item.children.length > 0) {
          baseItem.children = item.children.map((child: any, childIndex: number) =>
            transformItem(child, childIndex)
          );
        }

        return baseItem;
      };

      const transformedBoard = {
        id: board.uuid || board.id,
        title: board.title,
        category: board.category || "Uncategorized",
        statuses: board.statuses || [
          { id: "todo", name: "To Do", order: 0 },
          { id: "in_progress", name: "In Progress", order: 1 },
          { id: "completed", name: "Completed", order: 2 },
        ],
        items: board.items.map((item, index) => transformItem(item, index)),
        createdAt: board.createdAt,
        updatedAt: board.updatedAt,
      };

      return NextResponse.json({ board: transformedBoard });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}

export async function PUT(request: NextRequest, props: { params: Promise<{ boardId: string }> }) {
  const params = await props.params;
  return withApiAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { title, category } = body;

      const board = await getListById(params.boardId, user.username);
      if (!board) {
        return NextResponse.json({ error: "Board not found" }, { status: 404 });
      }

      if (board.type !== "kanban" && board.type !== "task") {
        return NextResponse.json({ error: "Not a kanban board" }, { status: 400 });
      }

      const formData = new FormData();
      formData.append("id", board.id);
      formData.append("title", title ?? board.title);
      formData.append("category", category ?? board.category ?? "Uncategorized");
      formData.append("originalCategory", board.category || "Uncategorized");
      formData.append("apiUser", JSON.stringify(user));

      const result = await updateList(formData);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      const transformedBoard = {
        id: result.data?.uuid || result.data?.id,
        title: result.data?.title,
        category: result.data?.category || "Uncategorized",
        statuses: result.data?.statuses || [
          { id: "todo", name: "To Do", order: 0 },
          { id: "in_progress", name: "In Progress", order: 1 },
          { id: "completed", name: "Completed", order: 2 },
        ],
        createdAt: result.data?.createdAt,
        updatedAt: result.data?.updatedAt,
      };

      return NextResponse.json({ success: true, data: transformedBoard });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ boardId: string }> }) {
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
      formData.append("id", board.id);
      formData.append("category", board.category || "Uncategorized");
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
        { status: 500 }
      );
    }
  });
}
