import { Item, KanbanStatus } from "@/app/_types";
import { updateItem, updateAllChildren } from "@/app/_utils/item-tree-utils";

const _findParent = (items: Item[], childId: string): Item | null => {
  for (const item of items) {
    if (item.children?.some((c) => c.id === childId)) return item;
    if (item.children) {
      const found = _findParent(item.children, childId);
      if (found) return found;
    }
  }
  return null;
};

export const applyStatus = (
  items: Item[],
  itemId: string,
  status: string,
  statuses: KanbanStatus[] | undefined,
  username: string,
  now: string,
): Item[] =>
  updateItem(items, itemId, (item) => {
    const updates: Partial<Item> = {
      status,
      lastModifiedBy: username,
      lastModifiedAt: now,
    };

    const targetStatus = statuses?.find((s) => s.id === status);
    if (targetStatus?.autoComplete) {
      updates.completed = true;
      if (item.children && item.children.length > 0) {
        updates.children = updateAllChildren(item.children, true, username, now);
      }
    } else if (item.completed && status !== item.status) {
      updates.completed = false;
    }

    if (status !== item.status) {
      updates.history = [
        ...(item.history || []),
        { status, timestamp: now, user: username },
      ];
    }

    return { ...item, ...updates };
  });

export const completeParent = (
  items: Item[],
  childId: string,
  statuses: KanbanStatus[] | undefined,
  username: string,
  now: string,
): Item[] => {
  const parent = _findParent(items, childId);
  if (!parent || !parent.children) return items;

  const allChildrenCompleted = parent.children.every((c) => c.completed);
  if (!allChildrenCompleted) return items;

  const autoCompleteStatus = statuses?.find((s) => s.autoComplete);
  if (!autoCompleteStatus) return items;

  return updateItem(items, parent.id, (p) => ({
    ...p,
    completed: true,
    status: autoCompleteStatus.id,
    lastModifiedBy: username,
    lastModifiedAt: now,
    history: [
      ...(p.history || []),
      { status: autoCompleteStatus.id, timestamp: now, user: username },
    ],
  }));
};
