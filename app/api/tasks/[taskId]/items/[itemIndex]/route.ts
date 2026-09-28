import { NextResponse } from "next/server";
import { z } from "zod";
import { removeItem } from "@/app/_server/actions/checklist-item/remover";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS, okSchema } from "@/app/_schemas/api/common";
import { apiItemSchema } from "@/app/_schemas/api/items";
import { taskItemParams } from "@/app/_schemas/api/tasks";
import { PermissionTypes } from "@/app/_types/enums";
import { toApiItem } from "@/app/_utils/api-item";
import { turnAway } from "@/app/_utils/api-utils";
import { fetchTask } from "@/app/_utils/api-task";
import { OUT_OF_RANGE, itemAtIndex } from "@/app/_utils/api-list-utils";

export const dynamic = "force-dynamic";

export const GET = defineRoute(
  {
    id: "getTaskItem",
    method: HttpMethod.GET,
    path: "/tasks/{taskId}/items/{itemIndex}",
    tag: ApiTag.TASKS,
    summary: "Get a task item",
    description: "Returns one item with its children and Kanban fields.",
    params: taskItemParams,
    responses: {
      200: { description: "The item", schema: z.object({ item: apiItemSchema }) },
      400: ERRORS[400],
      401: ERRORS[401],
      404: ERRORS[404],
      500: ERRORS[500],
    },
  },
  async ({ request, user, params }) => {
    const found = await fetchTask(request, params.taskId, user.username);
    if ("refusal" in found) return found.refusal;

    const hit = itemAtIndex(found.task.items, params.itemIndex);
    if (!hit) return refuse(OUT_OF_RANGE, 400);

    return NextResponse.json({ item: toApiItem(hit.item, hit.index, true) });
  },
);

export const DELETE = defineRoute(
  {
    id: "deleteTaskItem",
    method: HttpMethod.DELETE,
    path: "/tasks/{taskId}/items/{itemIndex}",
    tag: ApiTag.TASKS,
    summary: "Delete a task item",
    description: "Needs the delete grant on a shared task. Children go with it.",
    params: taskItemParams,
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

    const hit = itemAtIndex(task.items, params.itemIndex);
    if (!hit) return refuse(OUT_OF_RANGE, 400);

    const refused = await turnAway(user.username, task.uuid!, PermissionTypes.DELETE);
    if (refused) return refused;

    const result = await removeItem(user, task.uuid!, hit.item.id);
    if (!result.success) {
      return refuse(result.error || "Failed to delete item", 500);
    }

    return NextResponse.json({ success: true });
  },
);
