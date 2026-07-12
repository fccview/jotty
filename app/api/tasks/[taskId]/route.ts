import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, listUuid } from "@/app/_utils/api-utils";
import {
  getListById,
  updateList,
  deleteList,
} from "@/app/_server/actions/checklist";
import { isKanbanType } from "@/app/_types/enums";
import { toApiItem } from "@/app/_utils/api-item";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ taskId: string }> },
) {
  const params = await props.params;
  return withApiAuth(request, async (user) => {
    try {
      const uuid = await listUuid(request, params.taskId, user.username);
      const task = uuid ? await getListById(uuid, user.username) : undefined;
      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      if (!isKanbanType(task.type)) {
        return NextResponse.json(
          { error: "Not a task checklist" },
          { status: 400 },
        );
      }

      const transformedTask = {
        id: task.uuid,
        title: task.title,
        category: task.category || "Uncategorized",
        statuses: task.statuses || [
          { id: "todo", name: "To Do", order: 0 },
          { id: "in_progress", name: "In Progress", order: 1 },
          { id: "completed", name: "Completed", order: 2 },
        ],
        items: task.items.map((item, index) => toApiItem(item, index, true)),
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      };

      return NextResponse.json({ task: transformedTask });
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
  props: { params: Promise<{ taskId: string }> },
) {
  const params = await props.params;
  return withApiAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { title, category } = body;

      const uuid = await listUuid(request, params.taskId, user.username);
      const task = uuid ? await getListById(uuid, user.username) : undefined;
      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      if (!isKanbanType(task.type)) {
        return NextResponse.json(
          { error: "Not a task checklist" },
          { status: 400 },
        );
      }

      const formData = new FormData();
      formData.append("uuid", task.uuid!);
      formData.append("title", title ?? task.title);
      formData.append("category", category ?? task.category ?? "Uncategorized");
      formData.append("apiUser", JSON.stringify(user));

      const result = await updateList(formData);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      const transformedTask = {
        id: result.data?.uuid,
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

      return NextResponse.json({ success: true, data: transformedTask });
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
  props: { params: Promise<{ taskId: string }> },
) {
  const params = await props.params;
  return withApiAuth(request, async (user) => {
    try {
      const uuid = await listUuid(request, params.taskId, user.username);
      const task = uuid ? await getListById(uuid, user.username) : undefined;
      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      if (!isKanbanType(task.type)) {
        return NextResponse.json(
          { error: "Not a task checklist" },
          { status: 400 },
        );
      }

      const formData = new FormData();
      formData.append("uuid", task.uuid!);
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
