import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, listUuid, turnAway } from "@/app/_utils/api-utils";
import { getListById } from "@/app/_server/actions/checklist/queries";
import { removeItem } from "@/app/_server/actions/checklist-item/remover";
import { isKanbanType, PermissionTypes } from "@/app/_types/enums";
import { toApiItem } from "@/app/_utils/api-item";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ taskId: string; itemIndex: string }> },
) {
  const params = await props.params;
  return withApiAuth(request, async (user) => {
    try {
      const uuid = await listUuid(request, params.taskId, user.username);
      const task = uuid ? await getListById(uuid, user.username) : undefined;
      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      if (!isKanbanType(task.type)) {
        return NextResponse.json(
          { error: "Not a task checklist" },
          { status: 400 },
        );
      }

      const indexPath = params.itemIndex.split(".").map((i) => parseInt(i));

      for (const idx of indexPath) {
        if (isNaN(idx) || idx < 0) {
          return NextResponse.json(
            { error: "Invalid item index" },
            { status: 400 },
          );
        }
      }

      let item: any = null;
      let itemIndex = 0;
      let currentItems = task.items;

      for (const idx of indexPath) {
        if (idx >= currentItems.length) {
          return NextResponse.json(
            { error: "Item index out of range" },
            { status: 400 },
          );
        }
        item = currentItems[idx];
        itemIndex = idx;
        currentItems = item.children || [];
      }

      if (!item) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }

      return NextResponse.json({ item: toApiItem(item, itemIndex, true) });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  });
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ taskId: string; itemIndex: string }> },
) {
  const params = await props.params;
  return withApiAuth(request, async (user) => {
    try {
      const uuid = await listUuid(request, params.taskId, user.username);
      const task = uuid ? await getListById(uuid, user.username) : undefined;
      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      if (!isKanbanType(task.type)) {
        return NextResponse.json(
          { error: "Not a task checklist" },
          { status: 400 },
        );
      }

      const indexPath = params.itemIndex.split(".").map((i) => parseInt(i));

      for (const idx of indexPath) {
        if (isNaN(idx) || idx < 0) {
          return NextResponse.json(
            { error: "Invalid item index" },
            { status: 400 },
          );
        }
      }

      let item: any = null;
      let currentItems = task.items;

      for (const idx of indexPath) {
        if (idx >= currentItems.length) {
          return NextResponse.json(
            { error: "Item index out of range" },
            { status: 400 },
          );
        }
        item = currentItems[idx];
        currentItems = item.children || [];
      }

      if (!item) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }

      const refused = await turnAway(
        user.username,
        task.uuid!,
        PermissionTypes.DELETE,
      );
      if (refused) return refused;

      const result = await removeItem(user, task.uuid!, item.id);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to delete item" },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  });
}
