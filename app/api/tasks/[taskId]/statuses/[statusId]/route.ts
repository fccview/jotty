import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, listUuid, turnAway } from "@/app/_utils/api-utils";
import { getListById } from "@/app/_server/actions/checklist/queries";
import { restatus } from "@/app/_server/actions/checklist/restatus";
import { isKanbanType, PermissionTypes } from "@/app/_types/enums";
import { API_FALLBACK_STATUSES } from "@/app/_consts/kanban";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ taskId: string; statusId: string }> },
) {
  const params = await props.params;
  return withApiAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { label, color, order } = body;

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

      const currentStatuses = task.statuses || API_FALLBACK_STATUSES;

      const statusIndex = currentStatuses.findIndex(
        (s) => s.id === params.statusId,
      );
      if (statusIndex === -1) {
        return NextResponse.json(
          { error: "Status not found" },
          { status: 404 },
        );
      }

      const refused = await turnAway(
        user.username,
        task.uuid!,
        PermissionTypes.EDIT,
      );
      if (refused) return refused;

      const result = await restatus(user, task.uuid!, (latest) =>
        (latest || API_FALLBACK_STATUSES).map((s) =>
          s.id === params.statusId
            ? {
                ...s,
                label: label ?? s.label,
                color: color !== undefined ? color : s.color,
                order: order !== undefined ? order : s.order,
              }
            : s,
        ),
      );

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to update status" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        data: result.data?.statuses?.find((s) => s.id === params.statusId),
      });
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
  props: { params: Promise<{ taskId: string; statusId: string }> },
) {
  const params = await props.params;
  return withApiAuth(request, async (user) => {
    try {
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

      const statusIndex = currentStatuses.findIndex(
        (s) => s.id === params.statusId,
      );
      if (statusIndex === -1) {
        return NextResponse.json(
          { error: "Status not found" },
          { status: 404 },
        );
      }

      const refused = await turnAway(
        user.username,
        task.uuid!,
        PermissionTypes.EDIT,
      );
      if (refused) return refused;

      const result = await restatus(user, task.uuid!, (latest) =>
        (latest || API_FALLBACK_STATUSES).filter(
          (s) => s.id !== params.statusId,
        ),
      );

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to delete status" },
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
