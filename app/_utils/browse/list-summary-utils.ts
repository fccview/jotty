import { Checklist, Item, ItemStub, ListSummary, ListTicks, MiniColumn } from "@/app/_types";
import { isKanbanType, TaskStatus } from "@/app/_types/enums";
import { countItems, isItemCompleted, leafItems } from "@/app/_utils/checklist-count-utils";
import { boardAssignees, boardColumns, boardTrackedSeconds } from "@/app/_utils/kanban/board-utils";
import { sortByPriority } from "@/app/_utils/kanban";
import { plainItemText } from "@/app/_utils/item-href-utils";

export const TICK_COLUMNS = 16;
export const TICK_ROWS = 3;
export const NEXT_UP_SHOWN = 3;
export const MINI_BOARD_ROWS = 3;

type SummarySource = Pick<Checklist, "items" | "type" | "statuses" | "summary">;

const stubOf = (item: Item): ItemStub => ({
  id: item.id,
  text: item.text,
  ...(item.priority && { priority: item.priority }),
});

const ticksOf = (items: Item[], type: string): ListTicks => {
  const leaves = leafItems(items);
  const size = Math.max(1, Math.ceil(leaves.length / (TICK_COLUMNS * TICK_ROWS)));
  const groups = Array.from({ length: Math.ceil(leaves.length / size) }, (_, index) =>
    leaves.slice(index * size, index * size + size),
  );

  return {
    bucket: size,
    cells: groups.map((group) => ({
      key: group[0].id,
      label: group.length === 1 ? plainItemText(group[0].text) : "",
      done: group.filter((item) => isItemCompleted(item, type)).length,
      size: group.length,
    })),
  };
};

const columnsOf = (list: SummarySource): MiniColumn[] =>
  boardColumns(list).map(({ status, items }) => ({
    status,
    count: items.length,
    top: sortByPriority(items).slice(0, MINI_BOARD_ROWS).map(stubOf),
  }));

export const summarizeList = (list: SummarySource): ListSummary => {
  const isBoard = isKanbanType(list.type);
  const { total, completed } = countItems(list.items, list.type);
  const active = list.items.filter((item) => !item.isArchived);

  return {
    total,
    completed,
    isFinished:
      list.items.length > 0 && list.items.every((item) => isItemCompleted(item, list.type)),
    hasTodo: list.items.some((item) => item.status === TaskStatus.TODO),
    hasInProgress: list.items.some((item) => item.status === TaskStatus.IN_PROGRESS),
    cards: active.length,
    inProgress: active.filter((item) => item.status === TaskStatus.IN_PROGRESS).length,
    ticks: isBoard ? { bucket: 1, cells: [] } : ticksOf(list.items, list.type),
    open: isBoard
      ? []
      : leafItems(list.items)
          .filter((item) => !isItemCompleted(item, list.type))
          .slice(0, NEXT_UP_SHOWN)
          .map(stubOf),
    columns: isBoard ? columnsOf(list) : [],
    assignees: isBoard ? boardAssignees(list.items) : [],
    seconds: isBoard ? boardTrackedSeconds(list.items) : 0,
  };
};

export const listSummaryOf = (list: SummarySource): ListSummary =>
  list.summary || summarizeList(list);

export const isRecurringList = (list: Pick<Checklist, "items">): boolean =>
  list.items.some((item) => Boolean(item.recurrence));
