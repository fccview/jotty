import { describe, it, expect } from "vitest";
import {
  getColumnItems,
  visToColIndex,
  applyDrop,
} from "@/app/_utils/kanban/board-utils";
import { DEFAULT_KANBAN_STATUSES } from "@/app/_consts/kanban";
import { TaskStatus } from "@/app/_types/enums";
import { Checklist, Item } from "@/app/_types";

const makeItem = (id: string, status?: string, extra?: Partial<Item>): Item => ({
  id,
  text: id,
  completed: false,
  order: 0,
  status,
  ...extra,
});

const makeBoard = (items: Item[]): Checklist => ({
  id: "board",
  uuid: "11111111-2222-3333-4444-555555555555",
  title: "Board",
  type: "kanban",
  items,
  statuses: DEFAULT_KANBAN_STATUSES,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const NOW = "2026-06-12T12:00:00.000Z";
const USER = "frodo";

describe("getColumnItems", () => {
  it("returns items of the requested status in array order", () => {
    const items = [
      makeItem("a", TaskStatus.TODO),
      makeItem("b", TaskStatus.IN_PROGRESS),
      makeItem("c", TaskStatus.TODO),
    ];
    const column = getColumnItems(items, TaskStatus.TODO, DEFAULT_KANBAN_STATUSES);
    expect(column.map((i) => i.id)).toEqual(["a", "c"]);
  });

  it("excludes archived items", () => {
    const items = [
      makeItem("a", TaskStatus.TODO),
      makeItem("b", TaskStatus.TODO, { isArchived: true }),
    ];
    const column = getColumnItems(items, TaskStatus.TODO, DEFAULT_KANBAN_STATUSES);
    expect(column.map((i) => i.id)).toEqual(["a"]);
  });

  it("buckets invalid-status items into the first column only", () => {
    const items = [
      makeItem("a", "ghost-status"),
      makeItem("b", undefined),
      makeItem("c", TaskStatus.IN_PROGRESS),
    ];
    const first = getColumnItems(items, TaskStatus.TODO, DEFAULT_KANBAN_STATUSES);
    const second = getColumnItems(
      items,
      TaskStatus.IN_PROGRESS,
      DEFAULT_KANBAN_STATUSES,
    );
    expect(first.map((i) => i.id)).toEqual(["a", "b"]);
    expect(second.map((i) => i.id)).toEqual(["c"]);
  });
});

describe("visToColIndex", () => {
  const column = [
    makeItem("a", TaskStatus.TODO),
    makeItem("b", TaskStatus.TODO),
    makeItem("c", TaskStatus.TODO),
    makeItem("d", TaskStatus.TODO),
  ];

  it("is the identity when no filter is active", () => {
    expect(visToColIndex(column, column, 2)).toBe(2);
    expect(visToColIndex(column, column, 4)).toBe(4);
  });

  it("maps a drop before a visible anchor to its column position", () => {
    const visible = [column[1], column[3]];
    expect(visToColIndex(visible, column, 0)).toBe(1);
    expect(visToColIndex(visible, column, 1)).toBe(3);
  });

  it("maps a drop at the end of the visible list after the last visible item", () => {
    const visible = [column[0], column[2]];
    expect(visToColIndex(visible, column, 2)).toBe(3);
  });

  it("drops at the column end when nothing is visible", () => {
    expect(visToColIndex([], column, 0)).toBe(4);
  });
});

describe("applyDrop", () => {
  it("reorders within a column without touching metadata", () => {
    const board = makeBoard([
      makeItem("a", TaskStatus.TODO),
      makeItem("b", TaskStatus.TODO),
      makeItem("c", TaskStatus.TODO),
    ]);
    const result = applyDrop(board, "a", TaskStatus.TODO, 2, USER, NOW);
    const column = getColumnItems(
      result.items,
      TaskStatus.TODO,
      DEFAULT_KANBAN_STATUSES,
    );
    expect(column.map((i) => i.id)).toEqual(["b", "c", "a"]);
    expect(result.items.find((i) => i.id === "a")?.history).toBeUndefined();
    expect(result.items.find((i) => i.id === "a")?.lastModifiedBy).toBeUndefined();
  });

  it("moves cross-column with status, history, and exact position", () => {
    const board = makeBoard([
      makeItem("a", TaskStatus.TODO),
      makeItem("b", TaskStatus.IN_PROGRESS),
      makeItem("c", TaskStatus.IN_PROGRESS),
    ]);
    const result = applyDrop(board, "a", TaskStatus.IN_PROGRESS, 1, USER, NOW);
    const column = getColumnItems(
      result.items,
      TaskStatus.IN_PROGRESS,
      DEFAULT_KANBAN_STATUSES,
    );
    const moved = result.items.find((i) => i.id === "a");
    expect(column.map((i) => i.id)).toEqual(["b", "a", "c"]);
    expect(moved?.status).toBe(TaskStatus.IN_PROGRESS);
    expect(moved?.history).toEqual([
      { status: TaskStatus.IN_PROGRESS, timestamp: NOW, user: USER },
    ]);
    expect(moved?.lastModifiedBy).toBe(USER);
  });

  it("marks the item completed when dropped on an autoComplete column", () => {
    const board = makeBoard([
      makeItem("a", TaskStatus.TODO, {
        children: [makeItem("a1", TaskStatus.TODO)],
      }),
      makeItem("b", TaskStatus.COMPLETED),
    ]);
    const result = applyDrop(board, "a", TaskStatus.COMPLETED, 0, USER, NOW);
    const moved = result.items.find((i) => i.id === "a");
    expect(moved?.completed).toBe(true);
    expect(moved?.children?.[0].completed).toBe(true);
  });

  it("clears completed when leaving an autoComplete column", () => {
    const board = makeBoard([
      makeItem("a", TaskStatus.COMPLETED, { completed: true }),
      makeItem("b", TaskStatus.TODO),
    ]);
    const result = applyDrop(board, "a", TaskStatus.TODO, 0, USER, NOW);
    const moved = result.items.find((i) => i.id === "a");
    expect(moved?.completed).toBe(false);
    expect(moved?.status).toBe(TaskStatus.TODO);
  });

  it("preserves the relative order of other columns", () => {
    const board = makeBoard([
      makeItem("a", TaskStatus.TODO),
      makeItem("b", TaskStatus.PAUSED),
      makeItem("c", TaskStatus.TODO),
      makeItem("d", TaskStatus.PAUSED),
    ]);
    const result = applyDrop(board, "a", TaskStatus.IN_PROGRESS, 0, USER, NOW);
    const paused = getColumnItems(
      result.items,
      TaskStatus.PAUSED,
      DEFAULT_KANBAN_STATUSES,
    );
    const todo = getColumnItems(
      result.items,
      TaskStatus.TODO,
      DEFAULT_KANBAN_STATUSES,
    );
    expect(paused.map((i) => i.id)).toEqual(["b", "d"]);
    expect(todo.map((i) => i.id)).toEqual(["c"]);
  });

  it("clamps an out-of-range index to the column end", () => {
    const board = makeBoard([
      makeItem("a", TaskStatus.TODO),
      makeItem("b", TaskStatus.IN_PROGRESS),
    ]);
    const result = applyDrop(board, "a", TaskStatus.IN_PROGRESS, 99, USER, NOW);
    const column = getColumnItems(
      result.items,
      TaskStatus.IN_PROGRESS,
      DEFAULT_KANBAN_STATUSES,
    );
    expect(column.map((i) => i.id)).toEqual(["b", "a"]);
  });

  it("drops into an empty column", () => {
    const board = makeBoard([makeItem("a", TaskStatus.TODO)]);
    const result = applyDrop(board, "a", TaskStatus.PAUSED, 0, USER, NOW);
    expect(result.items.find((i) => i.id === "a")?.status).toBe(
      TaskStatus.PAUSED,
    );
  });

  it("renumbers order fields recursively", () => {
    const board = makeBoard([
      makeItem("a", TaskStatus.TODO, {
        order: 7,
        children: [makeItem("a1", TaskStatus.TODO, { order: 9 })],
      }),
      makeItem("b", TaskStatus.TODO, { order: 3 }),
    ]);
    const result = applyDrop(board, "a", TaskStatus.TODO, 1, USER, NOW);
    expect(result.items.map((i) => i.order)).toEqual([0, 1]);
    const moved = result.items.find((i) => i.id === "a");
    expect(moved?.children?.[0].order).toBe(0);
  });

  it("returns the checklist untouched for an unknown item", () => {
    const board = makeBoard([makeItem("a", TaskStatus.TODO)]);
    expect(applyDrop(board, "nope", TaskStatus.TODO, 0, USER, NOW)).toBe(board);
  });
});
