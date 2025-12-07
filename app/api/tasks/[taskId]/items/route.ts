import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { createItem } from "@/app/_server/actions/checklist-item";
import { getListById } from "@/app/_server/actions/checklist";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { serverWriteFile } from "@/app/_server/actions/file";
import { TaskStatus } from "@/app/_types/enums";
import path from "path";

const CHECKLISTS_FOLDER = "checklists";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  return withApiAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { text, status, parentIndex } = body;

      if (!text) {
        return NextResponse.json(
          { error: "Text is required" },
          { status: 400 }
        );
      }

      const task = await getListById(params.taskId, user.username);
      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      if (task.type !== "task") {
        return NextResponse.json({ error: "Not a task checklist" }, { status: 400 });
      }

      if (parentIndex !== undefined) {
        const indexPath = parentIndex.toString().split('.').map((i: string) => parseInt(i));
        let parentItem: any = null;
        let currentItems = task.items;

        for (const idx of indexPath) {
          if (idx >= currentItems.length) {
            return NextResponse.json(
              { error: "Parent item not found" },
              { status: 404 }
            );
          }
          parentItem = currentItems[idx];
          currentItems = parentItem.children || [];
        }

        if (!parentItem) {
          return NextResponse.json(
            { error: "Parent item not found" },
            { status: 404 }
          );
        }

        const newSubItem: any = {
          id: `${task.id}-sub-${Date.now()}`,
          text,
          status: status || TaskStatus.TODO,
          completed: false,
          order: 0,
        };

        const addSubItemToParent = (items: any[], parentId: string): boolean => {
          for (let item of items) {
            if (item.id === parentId) {
              if (!item.children) {
                item.children = [];
              }
              item.children.push(newSubItem);
              return true;
            }
            if (item.children && addSubItemToParent(item.children, parentId)) {
              return true;
            }
          }
          return false;
        };

        const updatedItems = JSON.parse(JSON.stringify(task.items));
        if (!addSubItemToParent(updatedItems, parentItem.id)) {
          return NextResponse.json(
            { error: "Failed to add sub-item" },
            { status: 500 }
          );
        }

        const updatedTask = {
          ...task,
          items: updatedItems,
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
      }

      const formData = new FormData();
      formData.append("listId", task.id);
      formData.append("text", text);
      formData.append("category", task.category || "Uncategorized");
      formData.append("status", status || TaskStatus.TODO);

      const result = await createItem(task, formData, user.username, true);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to create item" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, data: { id: result.data?.id } });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}
