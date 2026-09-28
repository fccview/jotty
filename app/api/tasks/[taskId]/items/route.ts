import { NextResponse } from "next/server";
import { z } from "zod";
import { addItem } from "@/app/_server/actions/checklist-item/editor";
import { graftItem } from "@/app/_server/actions/checklist-item/grafter";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS, okSchema } from "@/app/_schemas/api/common";
import { taskItemCreateBody, taskParams } from "@/app/_schemas/api/tasks";
import { PermissionTypes, TaskStatus } from "@/app/_types/enums";
import { turnAway } from "@/app/_utils/api-utils";
import { fetchTask } from "@/app/_utils/api-task";
import { itemAtIndex } from "@/app/_utils/api-list-utils";

export const dynamic = "force-dynamic";

const PARENT_NOT_FOUND = "Parent item not found";

export const POST = defineRoute(
  {
    id: "createTaskItem",
    method: HttpMethod.POST,
    path: "/tasks/{taskId}/items",
    tag: ApiTag.TASKS,
    summary: "Add a task item",
    description: "Adds a top-level item, or a sub-item under parentIndex. The response for a sub-item has no data field.",
    params: taskParams,
    body: taskItemCreateBody,
    responses: {
      200: {
        description: "Created",
        schema: z.union([
          z.object({
            success: z.literal(true),
            data: z.object({ id: z.string().describe("Id of the new item inside the task") }),
          }),
          okSchema,
        ]),
      },
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

    const refused = await turnAway(user.username, task.uuid!, PermissionTypes.EDIT);
    if (refused) return refused;

    const status = body.status || TaskStatus.TODO;

    if (body.parentIndex !== undefined) {
      const parent = itemAtIndex(task.items, String(body.parentIndex));
      if (!parent) return refuse(PARENT_NOT_FOUND, 404);

      const graft = new FormData();
      graft.append("uuid", task.uuid!);
      graft.append("parentId", parent.item.id);
      graft.append("text", body.text);
      graft.append("status", status);

      const grafted = await graftItem(user, graft);
      if (!grafted.success) {
        return refuse(grafted.error || "Failed to add sub-item", 500);
      }

      return NextResponse.json({ success: true });
    }

    const formData = new FormData();
    formData.append("text", body.text);
    formData.append("status", status);

    const result = await addItem(user, task, formData, true);
    if (!result.success) {
      return refuse(result.error || "Failed to create item", 500);
    }

    return NextResponse.json({ success: true, data: { id: result.data?.id } });
  },
);
