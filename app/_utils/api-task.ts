import { NextRequest } from "next/server";
import { Checklist, KanbanStatus } from "@/app/_types";
import { PermissionTypes, isKanbanType } from "@/app/_types/enums";
import { DEFAULT_KANBAN_STATUSES } from "@/app/_consts/kanban";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { getListById } from "@/app/_server/actions/checklist/queries";
import { refuse } from "@/app/_server/api/define-route";
import { listUuid } from "@/app/_utils/api-utils";
import { guard } from "@/app/_utils/api-list-utils";

export const TASK_NOT_FOUND = "Task not found";
export const NOT_A_TASK = "Not a task checklist";

export type TaskStatusView = KanbanStatus & { name?: string };

export type TaskLookup = { task: Checklist } | { refusal: Response };

export const LEGACY_TASK_STATUSES: TaskStatusView[] = DEFAULT_KANBAN_STATUSES.map(
  (status) => ({ ...status, name: status.label }),
);

export const taskStatuses = (list?: Pick<Checklist, "statuses">): TaskStatusView[] =>
  list?.statuses || LEGACY_TASK_STATUSES;

export const toApiTask = (list?: Checklist) => ({
  id: list?.uuid,
  title: list?.title,
  category: list?.category || UNCATEGORIZED,
  statuses: taskStatuses(list),
  createdAt: list?.createdAt,
  updatedAt: list?.updatedAt,
});


export const fetchTask = async (
  request: NextRequest,
  taskId: string,
  username: string,
  permission?: PermissionTypes,
): Promise<TaskLookup> => {
  const uuid = await listUuid(request, taskId, username);
  const task = uuid ? await getListById(uuid, username) : undefined;
  if (!task) return { refusal: refuse(TASK_NOT_FOUND, 404) };
  if (!isKanbanType(task.type)) return { refusal: refuse(NOT_A_TASK, 400) };
  const denied = await guard(username, task, permission);
  return denied ? { refusal: denied } : { task };
};
