import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { getListById, updateList, deleteList } from "@/app/_server/actions/checklist";
import { TaskStatus } from "@/app/_types/enums";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  return withApiAuth(request, async (user) => {
    try {
      const task = await getListById(params.taskId, user.username);
      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      if (task.type !== "task") {
        return NextResponse.json({ error: "Not a task checklist" }, { status: 400 });
      }

      const transformItem = (item: any, index: number): any => {
        const baseItem: any = {
          id: item.id,
          index,
          text: item.text,
          status: item.status || TaskStatus.TODO,
          completed: item.completed,
        };

        if (item.children && item.children.length > 0) {
          baseItem.children = item.children.map((child: any, childIndex: number) =>
            transformItem(child, childIndex)
          );
        }

        return baseItem;
      };

      const transformedTask = {
        id: task.uuid || task.id,
        title: task.title,
        category: task.category || "Uncategorized",
        statuses: task.statuses || [
          { id: "todo", name: "To Do", order: 0 },
          { id: "in_progress", name: "In Progress", order: 1 },
          { id: "completed", name: "Completed", order: 2 },
        ],
        items: task.items.map((item, index) => transformItem(item, index)),
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      };

      return NextResponse.json({ task: transformedTask });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  return withApiAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { title, category } = body;

      const task = await getListById(params.taskId, user.username);
      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      if (task.type !== "task") {
        return NextResponse.json({ error: "Not a task checklist" }, { status: 400 });
      }

      const formData = new FormData();
      formData.append("id", task.id);
      formData.append("title", title ?? task.title);
      formData.append("category", category ?? task.category ?? "Uncategorized");
      formData.append("originalCategory", task.category || "Uncategorized");
      formData.append("apiUser", JSON.stringify(user));

      const result = await updateList(formData);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      const transformedTask = {
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

      return NextResponse.json({ success: true, data: transformedTask });
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
  { params }: { params: { taskId: string } }
) {
  return withApiAuth(request, async (user) => {
    try {
      const task = await getListById(params.taskId, user.username);
      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      if (task.type !== "task") {
        return NextResponse.json({ error: "Not a task checklist" }, { status: 400 });
      }

      const formData = new FormData();
      formData.append("id", task.id);
      formData.append("category", task.category || "Uncategorized");
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
