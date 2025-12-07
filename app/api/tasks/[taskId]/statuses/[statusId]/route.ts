import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { getListById } from "@/app/_server/actions/checklist";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { serverWriteFile } from "@/app/_server/actions/file";
import path from "path";

const CHECKLISTS_FOLDER = "checklists";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: { taskId: string; statusId: string } }
) {
  return withApiAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { label, color, order } = body;

      const task = await getListById(params.taskId, user.username);
      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      if (task.type !== "task") {
        return NextResponse.json({ error: "Not a task checklist" }, { status: 400 });
      }

      const currentStatuses = task.statuses || [
        { id: "todo", label: "To Do", order: 0 },
        { id: "in_progress", label: "In Progress", order: 1 },
        { id: "completed", label: "Completed", order: 2 },
      ];

      const statusIndex = currentStatuses.findIndex((s) => s.id === params.statusId);
      if (statusIndex === -1) {
        return NextResponse.json({ error: "Status not found" }, { status: 404 });
      }

      const updatedStatuses = currentStatuses.map((s) =>
        s.id === params.statusId
          ? {
            ...s,
            label: label ?? s.label,
            color: color !== undefined ? color : s.color,
            order: order !== undefined ? order : s.order,
          }
          : s
      );

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

      return NextResponse.json({ success: true, data: updatedStatuses.find((s) => s.id === params.statusId) });
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
  { params }: { params: { taskId: string; statusId: string } }
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

      const currentStatuses = task.statuses || [
        { id: "todo", label: "To Do", order: 0 },
        { id: "in_progress", label: "In Progress", order: 1 },
        { id: "completed", label: "Completed", order: 2 },
      ];

      const statusIndex = currentStatuses.findIndex((s) => s.id === params.statusId);
      if (statusIndex === -1) {
        return NextResponse.json({ error: "Status not found" }, { status: 404 });
      }

      const updatedStatuses = currentStatuses.filter((s) => s.id !== params.statusId);

      const sortedStatuses = [...updatedStatuses].sort((a, b) => a.order - b.order);
      const defaultStatusId = sortedStatuses[0]?.id || 'todo';

      const updateItemStatus = (items: any[]): any[] => {
        return items.map((item) => {
          const updatedItem = { ...item };
          if (updatedItem.status === params.statusId) {
            updatedItem.status = defaultStatusId;
          }
          if (updatedItem.children) {
            updatedItem.children = updateItemStatus(updatedItem.children);
          }
          return updatedItem;
        });
      };

      const updatedTask = {
        ...task,
        statuses: updatedStatuses,
        items: updateItemStatus(task.items),
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
