import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { getListById } from "@/app/_server/actions/checklist";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { serverWriteFile } from "@/app/_server/actions/file";
import path from "path";
import { KanbanStatus } from "@/app/_types";

const CHECKLISTS_FOLDER = "checklists";

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
        return NextResponse.json(
          { error: "Not a task checklist" },
          { status: 400 }
        );
      }

      const statuses = task.statuses || [
        { id: "todo", label: "To Do", order: 0 },
        { id: "in_progress", label: "In Progress", order: 1 },
        { id: "completed", label: "Completed", order: 2 },
      ];

      return NextResponse.json({ statuses });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  return withApiAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { id, label, color, order, autoComplete } = body;

      if (!id || !label) {
        return NextResponse.json(
          { error: "Status id and label are required" },
          { status: 400 }
        );
      }

      const task = await getListById(params.taskId, user.username);
      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      if (task.type !== "task") {
        return NextResponse.json(
          { error: "Not a task checklist" },
          { status: 400 }
        );
      }

      const currentStatuses = task.statuses || [
        { id: "todo", label: "To Do", order: 0 },
        { id: "in_progress", label: "In Progress", order: 1 },
        { id: "completed", label: "Completed", order: 2 },
      ];

      if (currentStatuses.some((s) => s.id === id)) {
        return NextResponse.json(
          { error: "Status with this id already exists" },
          { status: 400 }
        );
      }

      const newStatus: KanbanStatus = {
        id,
        label,
        color,
        order: order ?? currentStatuses.length,
        autoComplete: autoComplete ?? false,
      };

      const updatedStatuses = [...currentStatuses, newStatus];

      const updatedTask = {
        ...task,
        statuses: updatedStatuses,
        updatedAt: new Date().toISOString(),
      };

      const ownerDir = path.join(
        process.cwd(),
        "data",
        CHECKLISTS_FOLDER,
        task.owner!
      );
      const filePath = path.join(
        ownerDir,
        task.category || "Uncategorized",
        `${task.id}.md`
      );

      await serverWriteFile(filePath, listToMarkdown(updatedTask as any));

      return NextResponse.json({ success: true, data: newStatus });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}
