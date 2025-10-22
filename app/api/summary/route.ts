import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { getNotes } from "@/app/_server/actions/note";
import { getLists } from "@/app/_server/actions/checklist";
import { isAdmin } from "@/app/_server/actions/users";
import { TaskStatus } from "@/app/_types/enums";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withApiAuth(request, async (user) => {
    try {
      const { searchParams } = new URL(request.url);
      const requestedUsername = searchParams.get("username");

      if (requestedUsername && requestedUsername !== user.username) {
        const isAdminUser = await isAdmin();
        if (!isAdminUser) {
          return NextResponse.json(
            {
              error: "Only administrators can query other users' summary data",
            },
            { status: 403 }
          );
        }
      }

      const username = requestedUsername || user.username;

      const notesResult = await getNotes(username);
      if (!notesResult.success || !notesResult.data) {
        return NextResponse.json(
          { error: notesResult.error || "Failed to fetch notes" },
          { status: 500 }
        );
      }

      const userNotes = notesResult.data.filter(
        (note) => note.owner === username
      );

      const listsResult = await getLists(username);
      if (!listsResult.success || !listsResult.data) {
        return NextResponse.json(
          { error: listsResult.error || "Failed to fetch checklists" },
          { status: 500 }
        );
      }

      const userLists = listsResult.data.filter(
        (list) => list.owner === username
      );

      let totalItems = 0;
      let completedItems = 0;
      let totalTasks = 0;
      let completedTasks = 0;
      let inProgressTasks = 0;
      let todoTasks = 0;

      userLists.forEach((list) => {
        totalItems += list.items.length;

        list.items.forEach((item) => {
          if (item.completed) {
            completedItems++;
          }

          if (list.type === "task" && item.status) {
            totalTasks++;
            switch (item.status) {
              case TaskStatus.COMPLETED:
                completedTasks++;
                break;
              case TaskStatus.IN_PROGRESS:
                inProgressTasks++;
                break;
              case TaskStatus.TODO:
                todoTasks++;
                break;
            }
          }
        });
      });

      const summary = {
        username,
        notes: {
          total: userNotes.length,
          categories: userNotes.reduce((acc, note) => {
            const category = note.category || "Uncategorized";
            acc[category] = (acc[category] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        },
        checklists: {
          total: userLists.length,
          categories: userLists.reduce((acc, list) => {
            const category = list.category || "Uncategorized";
            acc[category] = (acc[category] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          types: userLists.reduce((acc, list) => {
            const type = list.type || "simple";
            acc[type] = (acc[type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        },
        items: {
          total: totalItems,
          completed: completedItems,
          pending: totalItems - completedItems,
          completionRate:
            totalItems > 0
              ? Math.round((completedItems / totalItems) * 100)
              : 0,
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          inProgress: inProgressTasks,
          todo: todoTasks,
          completionRate:
            totalTasks > 0
              ? Math.round((completedTasks / totalTasks) * 100)
              : 0,
        },
      };

      return NextResponse.json({ summary });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}
