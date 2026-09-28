import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, listUuid, turnAway } from "@/app/_utils/api-utils";
import { getListById } from "@/app/_server/actions/checklist/queries";
import { restatus } from "@/app/_server/actions/checklist/restatus";
import { KanbanStatus } from "@/app/_types";
import { isKanbanType, PermissionTypes } from "@/app/_types/enums";
import { API_FALLBACK_STATUSES } from "@/app/_consts/kanban";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ taskId: string }> },
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

      const statuses = task.statuses || API_FALLBACK_STATUSES;

      return NextResponse.json({ statuses });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  });
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ taskId: string }> },
) {
  const params = await props.params;
  return withApiAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { id, label, color, order, autoComplete } = body;

      if (!id || !label) {
        return NextResponse.json(
          { error: "Status id and label are required" },
          { status: 400 },
        );
      }

      const uuid = await listUuid(request, params.taskId, user.username);
      const task = uuid ? await getListById(uuid, user.username) : undefined;
      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      if (task.type !== "kanban" && task.type !== "task") {
        return NextResponse.json(
          { error: "Not a task checklist" },
          { status: 400 },
        );
      }

      const currentStatuses = task.statuses || API_FALLBACK_STATUSES;

      if (currentStatuses.some((s) => s.id === id)) {
        return NextResponse.json(
          { error: "Status with this id already exists" },
          { status: 400 },
        );
      }

      const newStatus: KanbanStatus = {
        id,
        label,
        color,
        order: order ?? currentStatuses.length,
        autoComplete: autoComplete ?? false,
      };

      const refused = await turnAway(
        user.username,
        task.uuid!,
        PermissionTypes.EDIT,
      );
      if (refused) return refused;

      const result = await restatus(user, task.uuid!, (latest) => {
        const fresh = latest || API_FALLBACK_STATUSES;
        return fresh.some((s) => s.id === id) ? fresh : [...fresh, newStatus];
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to create status" },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true, data: newStatus });
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  });
}
