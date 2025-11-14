import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { getUserChecklists } from "@/app/_server/actions/checklist";
import { TaskStatus } from "@/app/_types/enums";
import { Checklist, Result } from "@/app/_types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withApiAuth(request, async (user) => {
    try {
      const lists = await getUserChecklists({ username: user.username }) as Result<Checklist[]>;
      if (!lists.success || !lists.data) {
        return NextResponse.json(
          { error: lists.error || "Failed to fetch checklists" },
          { status: 500 }
        );
      }

      const userLists = lists.data.filter((list) => list.owner === user.username);

      const checklists = userLists.map((list) => ({
        id: list.id,
        title: list.title,
        category: list.category || "Uncategorized",
        type: list.type || "simple",
        items: list.items.map((item, index) => {
          const baseItem = {
            index,
            text: item.text,
            completed: item.completed,
          };

          if (list.type === "task") {
            return {
              ...baseItem,
              status: item.status || TaskStatus.TODO,
              time:
                item.timeEntries && item.timeEntries.length > 0
                  ? item.timeEntries
                  : 0,
            };
          }

          return baseItem;
        }),
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
