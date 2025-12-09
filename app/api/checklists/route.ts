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
      const type = searchParams.get('type');
      const search = searchParams.get('q');

      const lists = await getUserChecklists({ username: user.username }) as Result<Checklist[]>;
      if (!lists.success || !lists.data) {
        return NextResponse.json(
          { error: lists.error || "Failed to fetch checklists" },
          { status: 500 }
        );
      }

      let userLists = lists.data.filter((list) => list.owner === user.username);

      if (category) {
        userLists = userLists.filter((list) => list.category === category);
      }
      if (type) {
        userLists = userLists.filter((list) => list.type === type);
      }
      if (search) {
        const searchLower = search.toLowerCase();
        userLists = userLists.filter((list) =>
          list.title?.toLowerCase().includes(searchLower) ||
          list.items.some(item => item.text.toLowerCase().includes(searchLower))
        );
      }

      const transformItem = (item: any, index: number, listType: string): any => {
        const baseItem: any = {
          id: item.id,
          index,
          text: item.text,
          completed: item.completed,
        };

        if (listType === "task") {
          baseItem.status = item.status || TaskStatus.TODO;
          baseItem.time =
            item.timeEntries && item.timeEntries.length > 0
              ? item.timeEntries
              : 0;
        }

        if (item.children && item.children.length > 0) {
          baseItem.children = item.children.map((child: any, childIndex: number) =>
            transformItem(child, childIndex, listType)
          );
        }

        return baseItem;
      };

      const checklists = userLists.map((list) => ({
        id: list.uuid || list.id,
        title: list.title,
        category: list.category || "Uncategorized",
        type: list.type || "simple",
        items: list.items.map((item, index) => transformItem(item, index, list.type)),
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
      }));

      return NextResponse.json({ checklists });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch checklists",
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
      const { title, category = "Uncategorized", type = "simple" } = body;

      if (!title) {
        return NextResponse.json(
          { error: "Title is required" },
          { status: 400 }
        );
      }

      if (type !== "simple" && type !== "task") {
        return NextResponse.json(
          { error: "Type must be 'simple' or 'task'" },
          { status: 400 }
        );
      }

      const formData = new FormData();
      formData.append("title", title);
      formData.append("category", category);
      formData.append("type", type);
      formData.append("user", JSON.stringify(user));

      const result = await createList(formData);

      if (result.error || !result.data) {
        console.error("Create list error:", result.error);
        return NextResponse.json({ error: result.error || "Failed to create checklist" }, { status: 400 });
      }

      const transformedChecklist = {
        id: result.data?.uuid || result.data?.id,
        title: result.data?.title,
        category: result.data?.category || "Uncategorized",
        type: result.data?.type || "simple",
        items: [],
        createdAt: result.data?.createdAt,
        updatedAt: result.data?.updatedAt,
      };

      return NextResponse.json({ success: true, data: transformedChecklist });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Internal server error" },
        { status: 500 }
      );
    }
  });
}
