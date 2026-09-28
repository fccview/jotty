import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserChecklists } from "@/app/_server/actions/checklist/queries";
import { makeList } from "@/app/_server/actions/checklist/creator";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS, envelope } from "@/app/_schemas/api/common";
import { taskCreateBody, taskListQuery, taskSchema } from "@/app/_schemas/api/tasks";
import { ChecklistsTypes, isKanbanType } from "@/app/_types/enums";
import { Checklist, KanbanStatus, Result } from "@/app/_types";
import { toApiItem } from "@/app/_utils/api-item";
import { toApiTask } from "@/app/_utils/api-task";

export const dynamic = "force-dynamic";

type NewColumn = NonNullable<z.output<typeof taskCreateBody>["statuses"]>[number];

const _toStatus = (column: NewColumn, position: number): KanbanStatus => ({
  id: column.id,
  label: column.label || column.name || column.id,
  ...(column.color !== undefined && { color: column.color }),
  order: column.order ?? position,
  ...(column.autoComplete !== undefined && { autoComplete: column.autoComplete }),
});

export const GET = defineRoute(
  {
    id: "listTasks",
    method: HttpMethod.GET,
    path: "/tasks",
    tag: ApiTag.TASKS,
    summary: "List tasks",
    description: "Task checklists the API key owner owns. Tasks shared with them are left out.",
    query: taskListQuery,
    responses: {
      200: { description: "Tasks", schema: z.object({ tasks: z.array(taskSchema) }) },
      400: ERRORS[400],
      401: ERRORS[401],
      500: ERRORS[500],
    },
  },
  async ({ user, query }) => {
    const lists = (await getUserChecklists({ username: user.username })) as Result<Checklist[]>;
    if (!lists.success || !lists.data) {
      return refuse(lists.error || "Failed to fetch tasks", 500);
    }

    const needle = query.q?.toLowerCase();
    const matches = lists.data.filter(
      (list) =>
        list.owner === user.username &&
        isKanbanType(list.type) &&
        (!query.category || list.category === query.category) &&
        (!query.status || list.items.some((item) => item.status === query.status)) &&
        (!needle ||
          list.title?.toLowerCase().includes(needle) ||
          list.items.some((item) => item.text.toLowerCase().includes(needle))),
    );

    return NextResponse.json({
      tasks: matches.map((list) => ({
        ...toApiTask(list),
        items: list.items.map((item, index) => toApiItem(item, index, true)),
      })),
    });
  },
);

export const POST = defineRoute(
  {
    id: "createTask",
    method: HttpMethod.POST,
    path: "/tasks",
    tag: ApiTag.TASKS,
    summary: "Create a task",
    description: "Creates a Kanban task checklist owned by the API key owner. Send statuses to pick your own columns.",
    body: taskCreateBody,
    responses: {
      200: { description: "Created task", schema: envelope(taskSchema) },
      400: ERRORS[400],
      401: ERRORS[401],
      500: ERRORS[500],
    },
  },
  async ({ user, body }) => {
    const formData = new FormData();
    formData.append("title", body.title);
    formData.append("category", body.category);
    formData.append("type", ChecklistsTypes.KANBAN);

    const result = await makeList(user, formData, body.statuses?.map(_toStatus));
    if (result.error || !result.data) {
      console.error("Create task error:", result.error);
      return refuse(result.error || "Failed to create task", 400);
    }

    return NextResponse.json({ success: true, data: { ...toApiTask(result.data), items: [] } });
  },
);
