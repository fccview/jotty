import { NextResponse } from "next/server";
import { PermissionTypes } from "@/app/_types/enums";
import { stampStatus } from "@/app/_server/actions/checklist-item/stamper";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS, okSchema } from "@/app/_schemas/api/common";
import { itemStatusBody, taskItemParams } from "@/app/_schemas/api/tasks";
import { fetchTask } from "@/app/_utils/api-task";
import { OUT_OF_RANGE, itemAtIndex } from "@/app/_utils/api-list-utils";

export const dynamic = "force-dynamic";

export const PUT = defineRoute(
  {
    id: "updateTaskItemStatus",
    method: HttpMethod.PUT,
    path: "/tasks/{taskId}/items/{itemIndex}/status",
    tag: ApiTag.TASKS,
    summary: "Move a task item to another status",
    params: taskItemParams,
    body: itemStatusBody,
    responses: {
      200: { description: "Moved", schema: okSchema },
      400: ERRORS[400],
      401: ERRORS[401],
      403: ERRORS[403],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ request, user, params, body }) => {
    const found = await fetchTask(request, params.taskId, user.username, PermissionTypes.EDIT);
    if ("refusal" in found) return found.refusal;
    const { task } = found;

    const hit = itemAtIndex(task.items, params.itemIndex);
    if (!hit) return refuse(OUT_OF_RANGE, 400);

    const formData = new FormData();
    formData.append("uuid", task.uuid!);
    formData.append("itemId", hit.item.id);
    formData.append("status", body.status);

    const result = await stampStatus(user, formData);
    if (!result.success) {
      return refuse(result.error || "Failed to update item status", 500);
    }

    return NextResponse.json({ success: true });
  },
);
