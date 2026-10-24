import { Item } from "@/app/_types";
import { ChecklistsTypes, TaskStatus } from "@/app/_types/enums";

export const isItemCompleted = (item: Item, checklistType: string): boolean => {
  if (
    checklistType === ChecklistsTypes.KANBAN ||
    checklistType === ChecklistsTypes.TASK
  ) {
    return item.status === TaskStatus.COMPLETED || !!item.completed;
  }
  return !!item.completed;
};

export const leafItems = (items: Item[]): Item[] =>
  items.flatMap((item) => {
    if (item.isArchived) return [];
    if (item.children && item.children.length > 0) {
      return leafItems(item.children);
    }
    return [item];
  });

export const countItems = (
  items: Item[],
  checklistType?: string,
): { total: number; completed: number } => {
  const leaves = leafItems(items);
  return {
    total: leaves.length,
    completed: leaves.filter((item) =>
      isItemCompleted(item, checklistType || ""),
    ).length,
  };
};

export const getCompletionRate = (
  items: Item[],
  checklistType?: string,
): number => {
  const { total, completed } = countItems(items, checklistType);
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};
