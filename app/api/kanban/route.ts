import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { getUserChecklists } from "@/app/_server/actions/checklist";
import { makeList } from "@/app/_server/actions/checklist/creator";
import { isKanbanType } from "@/app/_types/enums";
import { Checklist, Result } from "@/app/_types";
import { transformBoard } from "@/app/_utils/kanban/api-transforms";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withApiAuth(request, async (user) => {
    try {
      const { searchParams } = new URL(request.url);
      const category = searchParams.get("category");
      const status = searchParams.get("status");
      const search = searchParams.get("q");

      const lists = (await getUserChecklists({
        username: user.username,
      })) as Result<Checklist[]>;
      if (!lists.success || !lists.data) {
        return NextResponse.json(
          { error: lists.error || "Failed to fetch boards" },
          { status: 500 },
        );
      }

      let boards = lists.data.filter(
        (list) => list.owner === user.username && isKanbanType(list.type),
      );

      if (category) {
        boards = boards.filter((list) => list.category === category);
      }
      if (status) {
        boards = boards.filter((list) =>
          list.items.some((item) => item.status === status),
        );
      }
      if (search) {
        const searchLower = search.toLowerCase();
        boards = boards.filter(
          (list) =>
            list.title?.toLowerCase().includes(searchLower) ||
            list.items.some((item) =>
              item.text.toLowerCase().includes(searchLower),
            ),
        );
      }

      const data = boards.map((list) => transformBoard(list));

      return NextResponse.json({ boards: data });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to fetch boards",
        },
        { status: 500 },
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
          { status: 400 },
        );
      }

      const formData = new FormData();
      formData.append("title", title);
      formData.append("category", category);
      formData.append("type", "kanban");

      if (statuses) {
        formData.append("statuses", JSON.stringify(statuses));
      }

      const result = await makeList(user, formData);

      if (result.error || !result.data) {
        console.error("Create board error:", result.error);
        return NextResponse.json(
          { error: result.error || "Failed to create board" },
          { status: 400 },
        );
      }

      return NextResponse.json({ success: true, data: transformBoard(result.data) });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Internal server error",
        },
        { status: 500 },
      );
    }
  });
}
