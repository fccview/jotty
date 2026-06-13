import { Checklist, Item, KanbanStatus } from "@/app/_types";
import { TaskStatus } from "@/app/_types/enums";
import { DEFAULT_KANBAN_STATUSES } from "@/app/_consts/kanban";
import { applyStatus, completeParent } from "@/app/_utils/item-status-utils";

const _renumber = (items: Item[]): Item[] =>
  items.map((item, idx) => ({
    ...item,
    order: idx,
    children: item.children ? _renumber(item.children) : item.children,
  }));

const _firstStatusId = (statuses: KanbanStatus[] | undefined): string => {
  const statusList = statuses || DEFAULT_KANBAN_STATUSES;
  return (
    [...statusList].sort((a, b) => a.order - b.order)[0]?.id || TaskStatus.TODO
  );
};

export const getColumnItems = (
  items: Item[],
  statusId: string,
  statuses: KanbanStatus[] | undefined,
): Item[] => {
  const statusList = statuses || DEFAULT_KANBAN_STATUSES;
  const firstStatus = _firstStatusId(statuses);
  const validIds = statusList.map((s) => s.id);

  return items.filter((item) => {
    if (item.isArchived) return false;
    if (item.status === statusId) return true;
    if (statusId === firstStatus) {
      return !validIds.includes(item.status || "");
    }
    return false;
  });
};

export const visToColIndex = (
  visibleItems: Item[],
  columnItems: Item[],
  visIndex: number,
): number => {
  if (visIndex < visibleItems.length) {
    const safeIndex = Math.max(0, visIndex);
    const anchor = visibleItems[safeIndex];
    if (!anchor) return columnItems.length;
    const anchorIdx = columnItems.findIndex((item) => item.id === anchor.id);
    return anchorIdx === -1 ? columnItems.length : anchorIdx;
  }

  const lastVisible = visibleItems[visibleItems.length - 1];
  if (!lastVisible) return columnItems.length;

  const lastIdx = columnItems.findIndex((item) => item.id === lastVisible.id);
  return lastIdx === -1 ? columnItems.length : lastIdx + 1;
};

export const applyDrop = (
  checklist: Checklist,
  itemId: string,
  targetStatus: string,
  colIndex: number,
  username: string,
  now: string,
): Checklist => {
  const dragged = checklist.items.find((item) => item.id === itemId);
  if (!dragged) return checklist;

  const isStatusChange = (dragged.status || TaskStatus.TODO) !== targetStatus;
  const withStatus = isStatusChange
    ? completeParent(
        applyStatus(
          checklist.items,
          itemId,
          targetStatus,
          checklist.statuses,
          username,
          now,
        ),
        itemId,
        checklist.statuses,
        username,
        now,
      )
    : checklist.items;

  const moved = withStatus.find((item) => item.id === itemId);
  if (!moved) return checklist;

  const remaining = withStatus.filter((item) => item.id !== itemId);
  const column = getColumnItems(remaining, targetStatus, checklist.statuses);
  const clamped = Math.max(0, Math.min(colIndex, column.length));

  let insertAt: number;
  if (column.length === 0) {
    insertAt = remaining.length;
  } else if (clamped < column.length) {
    insertAt = remaining.findIndex((item) => item.id === column[clamped].id);
  } else {
    insertAt =
      remaining.findIndex(
        (item) => item.id === column[column.length - 1].id,
      ) + 1;
  }

  const reordered = [...remaining];
  reordered.splice(insertAt, 0, moved);

  return { ...checklist, items: _renumber(reordered), updatedAt: now };
};
