import { KanbanStatus } from "@/app/_types";
import { TaskStatus, TaskStatusLabels } from "@/app/_types/enums";

export const DEFAULT_KANBAN_STATUSES: KanbanStatus[] = [
  {
    id: TaskStatus.TODO,
    label: TaskStatusLabels.TODO,
    order: 0,
    autoComplete: false,
  },
  {
    id: TaskStatus.IN_PROGRESS,
    label: TaskStatusLabels.IN_PROGRESS,
    order: 1,
    autoComplete: false,
  },
  {
    id: TaskStatus.COMPLETED,
    label: TaskStatusLabels.COMPLETED,
    order: 2,
    autoComplete: true,
  },
  {
    id: TaskStatus.PAUSED,
    label: TaskStatusLabels.PAUSED,
    order: 3,
    autoComplete: false,
  },
];
