import { NextResponse } from "next/server";
import { z } from "zod";
import { dropList, editList } from "@/app/_server/actions/checklist/editor";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS, envelope, okSchema } from "@/app/_schemas/api/common";
import { taskParams, taskSchema, taskUpdateBody } from "@/app/_schemas/api/tasks";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { toApiItem } from "@/app/_utils/api-item";
import { fetchTask, toApiTask } from "@/app/_utils/api-task";

export const dynamic = "force-dynamic";

export const GET = defineRoute(
  {
    id: "getTask",
    method: HttpMethod.GET,
    path: "/tasks/{taskId}",
    tag: ApiTag.TASKS,
    summary: "Get a task",
    params: taskParams,
    responses: {
      200: { description: "The task", schema: z.object({ task: taskSchema }) },
      400: ERRORS[400],
      401: ERRORS[401],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ request, user, params }) => {
    const found = await fetchTask(request, params.taskId, user.username);
    if ("refusal" in found) return found.refusal;
    const { task } = found;

    return NextResponse.json({
      task: {
        ...toApiTask(task),
        items: task.items.map((item, index) => toApiItem(item, index, true)),
      },
    });
  },
);

export const PUT = defineRoute(
  {
    id: "updateTask",
    method: HttpMethod.PUT,
    path: "/tasks/{taskId}",
    tag: ApiTag.TASKS,
    summary: "Update a task",
    description: "Changes the title, the category or both. Fields left out keep their current value.",
    params: taskParams,
    body: taskUpdateBody,
    responses: {
      200: { description: "Updated task, without items", schema: envelope(taskSchema) },
      400: ERRORS[400],
      401: ERRORS[401],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ request, user, params, body }) => {
    const found = await fetchTask(request, params.taskId, user.username);
    if ("refusal" in found) return found.refusal;
    const { task } = found;

    const formData = new FormData();
    formData.append("uuid", task.uuid!);
    formData.append("title", body.title ?? task.title);
    formData.append("category", body.category ?? task.category ?? UNCATEGORIZED);

    const result = await editList(user, formData);
    if (result.error) return refuse(result.error, 400);

    return NextResponse.json({ success: true, data: toApiTask(result.data) });
  },
);

export const DELETE = defineRoute(
  {
    id: "deleteTask",
    method: HttpMethod.DELETE,
    path: "/tasks/{taskId}",
    tag: ApiTag.TASKS,
    summary: "Delete a task",
    params: taskParams,
    responses: {
      200: { description: "Deleted", schema: okSchema },
      400: ERRORS[400],
      401: ERRORS[401],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ request, user, params }) => {
    const found = await fetchTask(request, params.taskId, user.username);
    if ("refusal" in found) return found.refusal;

    const formData = new FormData();
    formData.append("uuid", found.task.uuid!);

    const result = await dropList(user, formData);
    if (result.error) return refuse(result.error, 400);

    return NextResponse.json({ success: true });
  },
);
