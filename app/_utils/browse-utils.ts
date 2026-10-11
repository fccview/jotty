import { Checklist, DefaultChecklistFilter } from "@/app/_types";
import { BoardFilter } from "@/app/_consts/browse";
import { isKanbanType, TaskStatus } from "@/app/_types/enums";
import { isItemCompleted } from "@/app/_utils/checklist-utils";

const isFinished = (list: Checklist) =>
  list.items.length > 0 && list.items.every((item) => isItemCompleted(item, list.type));

const hasStatus = (list: Checklist, status: TaskStatus) =>
  list.items.some((item) => item.status === status);

export const matchesListFilter = (
  list: Checklist,
  filter: DefaultChecklistFilter | BoardFilter,
  isPinned: boolean,
): boolean => {
  switch (filter) {
    case "pinned":
      return isPinned;
    case "completed":
      return isFinished(list);
    case "incomplete":
      return !isFinished(list);
    case "task":
      return isKanbanType(list.type);
    case "simple":
      return list.type === "simple";
    case "todo":
      return hasStatus(list, TaskStatus.TODO);
    case "in-progress":
      return hasStatus(list, TaskStatus.IN_PROGRESS);
    default:
      return true;
  }
};
