import { NextResponse } from "next/server";
import { z } from "zod";
import { restatus } from "@/app/_server/actions/checklist/restatus";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS, envelope } from "@/app/_schemas/api/common";
import { kanbanStatusSchema } from "@/app/_schemas/api/items";
import { statusCreateBody, taskParams } from "@/app/_schemas/api/tasks";
import { KanbanStatus } from "@/app/_types";
import { PermissionTypes } from "@/app/_types/enums";
import { DEFAULT_KANBAN_STATUSES } from "@/app/_consts/kanban";
import { turnAway } from "@/app/_utils/api-utils";
import { fetchTask } from "@/app/_utils/api-task";

export const dynamic = "force-dynamic";

export const GET = defineRoute(
  {
    id: "listTaskStatuses",
    method: HttpMethod.GET,
    path: "/tasks/{taskId}/statuses",
    tag: ApiTag.TASKS,
    summary: "List task statuses",
    description: "The Kanban columns of a task, in stored order.",
    params: taskParams,
    responses: {
      200: { description: "Statuses", schema: z.object({ statuses: z.array(kanbanStatusSchema) }) },
      400: ERRORS[400],
      401: ERRORS[401],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ request, user, params }) => {
    const found = await fetchTask(request, params.taskId, user.username);
    if ("refusal" in found) return found.refusal;

    return NextResponse.json({ statuses: found.task.statuses || DEFAULT_KANBAN_STATUSES });
  },
);

export const POST = defineRoute(
  {
    id: "createTaskStatus",
    method: HttpMethod.POST,
    path: "/tasks/{taskId}/statuses",
    tag: ApiTag.TASKS,
    summary: "Add a task status",
    description: "Adds a Kanban column. Needs the edit grant on a shared task.",
    params: taskParams,
    body: statusCreateBody,
    responses: {
      200: { description: "Created status", schema: envelope(kanbanStatusSchema) },
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

    const current = task.statuses || DEFAULT_KANBAN_STATUSES;
    if (current.some((status) => status.id === body.id)) {
      return refuse("Status with this id already exists", 400);
    }

    const created: KanbanStatus = {
      id: body.id,
      label: body.label,
      color: body.color,
      order: body.order ?? current.length,
      autoComplete: body.autoComplete ?? false,
    };

    const refused = await turnAway(user.username, task.uuid!, PermissionTypes.EDIT);
    if (refused) return refused;

    const result = await restatus(user, task.uuid!, (latest) => {
      const fresh = latest || DEFAULT_KANBAN_STATUSES;
      return fresh.some((status) => status.id === body.id) ? fresh : [...fresh, created];
    });
    if (!result.success) {
      return refuse(result.error || "Failed to create status", 500);
    }

    return NextResponse.json({ success: true, data: created });
  },
);
