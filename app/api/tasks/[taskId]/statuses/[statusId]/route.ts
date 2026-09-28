import { NextResponse } from "next/server";
import { restatus } from "@/app/_server/actions/checklist/restatus";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS, envelope, okSchema } from "@/app/_schemas/api/common";
import { kanbanStatusSchema } from "@/app/_schemas/api/items";
import { statusUpdateBody, taskStatusParams } from "@/app/_schemas/api/tasks";
import { PermissionTypes } from "@/app/_types/enums";
import { API_FALLBACK_STATUSES } from "@/app/_consts/kanban";
import { turnAway } from "@/app/_utils/api-utils";
import { fetchTask } from "@/app/_utils/api-task";

export const dynamic = "force-dynamic";

const STATUS_NOT_FOUND = "Status not found";

export const PUT = defineRoute(
  {
    id: "updateTaskStatus",
    method: HttpMethod.PUT,
    path: "/tasks/{taskId}/statuses/{statusId}",
    tag: ApiTag.TASKS,
    summary: "Update a task status",
    description: "Fields left out keep their current value. Needs the edit grant on a shared task.",
    params: taskStatusParams,
    body: statusUpdateBody,
    responses: {
      200: { description: "Updated status", schema: envelope(kanbanStatusSchema) },
      400: ERRORS[400],
      401: ERRORS[401],
      403: ERRORS[403],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ request, user, params, body }) => {
    const found = await fetchTask(request, params.taskId, user.username);
    if ("refusal" in found) return found.refusal;
    const { task } = found;

    const current = task.statuses || API_FALLBACK_STATUSES;
    if (!current.some((status) => status.id === params.statusId)) {
      return refuse(STATUS_NOT_FOUND, 404);
    }

    const refused = await turnAway(user.username, task.uuid!, PermissionTypes.EDIT);
    if (refused) return refused;

    const result = await restatus(user, task.uuid!, (latest) =>
      (latest || API_FALLBACK_STATUSES).map((status) =>
        status.id === params.statusId
          ? {
              ...status,
              label: body.label ?? status.label,
              color: body.color === undefined ? status.color : body.color ?? undefined,
              order: body.order ?? status.order,
              autoComplete: body.autoComplete ?? status.autoComplete,
            }
          : status,
      ),
    );
    if (!result.success) {
      return refuse(result.error || "Failed to update status", 500);
    }

    return NextResponse.json({
      success: true,
      data: result.data?.statuses?.find((status) => status.id === params.statusId),
    });
  },
);

export const DELETE = defineRoute(
  {
    id: "deleteTaskStatus",
    method: HttpMethod.DELETE,
    path: "/tasks/{taskId}/statuses/{statusId}",
    tag: ApiTag.TASKS,
    summary: "Delete a task status",
    description: "Items in the deleted column, sub-items included, move to the remaining status with the lowest order and get a history entry. Needs the edit grant on a shared task.",
    params: taskStatusParams,
    responses: {
      200: { description: "Deleted", schema: okSchema },
      400: ERRORS[400],
      401: ERRORS[401],
      403: ERRORS[403],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ request, user, params }) => {
    const found = await fetchTask(request, params.taskId, user.username);
    if ("refusal" in found) return found.refusal;
    const { task } = found;

    const current = task.statuses || API_FALLBACK_STATUSES;
    if (!current.some((status) => status.id === params.statusId)) {
      return refuse(STATUS_NOT_FOUND, 404);
    }

    const refused = await turnAway(user.username, task.uuid!, PermissionTypes.EDIT);
    if (refused) return refused;

    const result = await restatus(user, task.uuid!, (latest) =>
      (latest || API_FALLBACK_STATUSES).filter((status) => status.id !== params.statusId),
    );
    if (!result.success) {
      return refuse(result.error || "Failed to delete status", 500);
    }

    return NextResponse.json({ success: true });
  },
);
