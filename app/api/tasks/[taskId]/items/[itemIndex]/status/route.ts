import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { getListById } from "@/app/_server/actions/checklist";
import { updateItem } from "@/app/_server/actions/checklist-item";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: { taskId: string; itemIndex: string } }
) {
  return withApiAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { status } = body;

      if (!status) {
        return NextResponse.json(
          { error: "Status is required" },
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

      const indexPath = params.itemIndex.split('.').map(i => parseInt(i));

      for (const idx of indexPath) {
        if (isNaN(idx) || idx < 0) {
          return NextResponse.json(
            { error: "Invalid item index" },
            { status: 400 }
          );
        }
      }

      let item: any = null;
      let currentItems = task.items;

      for (const idx of indexPath) {
        if (idx >= currentItems.length) {
          return NextResponse.json(
            { error: "Item index out of range" },
            { status: 400 }
          );
        }
        item = currentItems[idx];
        currentItems = item.children || [];
      }

      if (!item) {
        return NextResponse.json(
          { error: "Item not found" },
          { status: 404 }
        );
      }

      const formData = new FormData();
      formData.append("listId", task.id);
      formData.append("itemId", item.id);
      formData.append("status", status);
      formData.append("category", task.category || "Uncategorized");

      const result = await updateItem(task, formData, user.username, true);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to update item status" },
          { status: 500 }
        );
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
