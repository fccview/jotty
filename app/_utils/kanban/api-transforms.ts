import { Item, Checklist } from "@/app/_types";
import { TaskStatus } from "@/app/_types/enums";
import { DEFAULT_KANBAN_STATUSES } from "@/app/_consts/kanban";

interface TransformedItem {
  id: string;
  index: number;
  text: string;
  status: string;
  completed: boolean;
  priority?: string;
  score?: number;
  assignee?: string;
  reminder?: { datetime: string; notified?: boolean };
  children?: TransformedItem[];
}

export const transformItem = (item: Item, index: number): TransformedItem => {
  const baseItem: TransformedItem = {
    id: item.id,
    index,
    text: item.text,
    status: item.status || TaskStatus.TODO,
    completed: item.completed,
    priority: item.priority,
    score: item.score,
    assignee: item.assignee,
    reminder: item.reminder,
  };

  if (item.children && item.children.length > 0) {
    baseItem.children = item.children.map(
      (child: Item, childIndex: number) =>
        transformItem(child, childIndex),
    );
  }

  return baseItem;
};

export const transformBoard = (list: Checklist) => ({
  id: list.uuid,
  title: list.title,
  category: list.category || "Uncategorized",
  statuses: list.statuses || DEFAULT_KANBAN_STATUSES,
  items: list.items.map((item, index) => transformItem(item, index)),
  createdAt: list.createdAt,
  updatedAt: list.updatedAt,
});
