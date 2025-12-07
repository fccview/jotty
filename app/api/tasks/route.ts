import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { getUserChecklists, createList } from "@/app/_server/actions/checklist";
import { TaskStatus } from "@/app/_types/enums";
import { Checklist, Result } from "@/app/_types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withApiAuth(request, async (user) => {
    try {
      const { searchParams } = new URL(request.url);
      const category = searchParams.get('category');
      const status = searchParams.get('status');
      const search = searchParams.get('q');

      const lists = await getUserChecklists({ username: user.username }) as Result<Checklist[]>;
      if (!lists.success || !lists.data) {
        return NextResponse.json(
          { error: lists.error || "Failed to fetch tasks" },
          { status: 500 }
        );
      }

      let userTasks = lists.data.filter(
        (list) => list.owner === user.username && list.type === "task"
      );

      if (category) {
        userTasks = userTasks.filter((list) => list.category === category);
      }
      if (status) {
        userTasks = userTasks.filter((list) =>
          list.items.some(item => item.status === status)
        );
      }
      if (search) {
        const searchLower = search.toLowerCase();
        userTasks = userTasks.filter((list) =>
          list.title?.toLowerCase().includes(searchLower) ||
          list.items.some(item => item.text.toLowerCase().includes(searchLower))
        );
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

      const tasks = userTasks.map((list) => ({
        id: list.uuid || list.id,
        title: list.title,
        category: list.category || "Uncategorized",
        statuses: list.statuses || [
          { id: "todo", name: "To Do", order: 0 },
          { id: "in_progress", name: "In Progress", order: 1 },
          { id: "completed", name: "Completed", order: 2 },
        ],
        items: list.items.map((item, index) => transformItem(item, index)),
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
      }));

      return NextResponse.json({ tasks });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch tasks",
        },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return withApiAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { title, category = "Uncategorized", statuses } = body;

      if (!title) {
        return NextResponse.json(
          { error: "Title is required" },
          { status: 400 }
        );
      }

      const formData = new FormData();
      formData.append("title", title);
      formData.append("category", category);
      formData.append("type", "task");
      formData.append("user", JSON.stringify(user));

      if (statuses) {
        formData.append("statuses", JSON.stringify(statuses));
      }

      const result = await createList(formData);

      if (result.error || !result.data) {
        console.error("Create task error:", result.error);
        return NextResponse.json({ error: result.error || "Failed to create task" }, { status: 400 });
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
        items: [],
        createdAt: result.data?.createdAt,
        updatedAt: result.data?.updatedAt,
      };

      return NextResponse.json({ success: true, data: transformedTask });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Internal server error" },
        { status: 500 }
      );
    }
  });
}
