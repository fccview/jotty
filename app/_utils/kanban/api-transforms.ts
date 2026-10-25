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
  description?: string;
  externalId?: string;
  path?: string;
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
    description: item.description,
    externalId: item.externalId,
  };

  if (item.children && item.children.length > 0) {
    baseItem.children = item.children.map(
      (child: Item, childIndex: number) =>
        transformItem(child, childIndex),
    );
  }

  return baseItem;
};

const _cardWithExternalId = (
  items: Item[],
  externalId: string,
  trail: number[] = [],
): TransformedItem | undefined => {
  const index = items.findIndex((item) => item.externalId === externalId);
  if (index >= 0) return { ...transformItem(items[index], index), path: [...trail, index].join(".") };
  return items.reduce<TransformedItem | undefined>(
    (found, item, at) => found ?? _cardWithExternalId(item.children || [], externalId, [...trail, at]),
    undefined,
  );
};

const _items = (items: Item[], externalId?: string): TransformedItem[] => {
  if (!externalId) return items.map((item, index) => transformItem(item, index));
  const card = _cardWithExternalId(items, externalId);
  return card ? [card] : [];
};

const _statusCounts = (items: Item[]) =>
  items.reduce<Record<string, number>>((counts, item) => {
    const status = item.status || TaskStatus.TODO;
    counts[status] = (counts[status] ?? 0) + 1;
    return counts;
  }, {});

export const transformBoard = (list: Checklist, view: ListView = ListView.FULL, externalId?: string) => ({
  id: list.uuid,
  title: list.title,
  category: list.category || UNCATEGORIZED,
  statuses: list.statuses || DEFAULT_KANBAN_STATUSES,
  ...(list.specNote && { specNote: list.specNote }),
  ...(view === ListView.SUMMARY
    ? { itemCount: list.items.length, statusCounts: _statusCounts(list.items) }
    : { items: _items(list.items, externalId) }),
  createdAt: list.createdAt,
  updatedAt: list.updatedAt,
});
