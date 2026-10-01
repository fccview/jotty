import { Item, Checklist } from "@/app/_types";
import { TaskStatus } from "@/app/_types/enums";
import { DEFAULT_KANBAN_STATUSES } from "@/app/_consts/kanban";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { ListView } from "@/app/_schemas/api/common";

interface TransformedItem {
  id: string;
  index: number;
  text: string;
  status: string;
  completed: boolean;
  priority?: string;
  score?: number;
  assignee?: string;
  agent?: string;
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
    agent: item.agent,
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

const _statusCounts = (items: Item[]) =>
  items.reduce<Record<string, number>>((counts, item) => {
    const status = item.status || TaskStatus.TODO;
    counts[status] = (counts[status] ?? 0) + 1;
    return counts;
  }, {});

export const transformBoard = (list: Checklist, view: ListView = ListView.FULL) => ({
  id: list.uuid,
  title: list.title,
  category: list.category || UNCATEGORIZED,
  statuses: list.statuses || DEFAULT_KANBAN_STATUSES,
  ...(list.specNote && { specNote: list.specNote }),
  ...(view === ListView.SUMMARY
    ? { itemCount: list.items.length, statusCounts: _statusCounts(list.items) }
    : { items: list.items.map((item, index) => transformItem(item, index)) }),
  createdAt: list.createdAt,
  updatedAt: list.updatedAt,
});
