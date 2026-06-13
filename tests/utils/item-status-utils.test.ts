import { describe, it, expect } from "vitest";
import { applyStatus, completeParent } from "@/app/_utils/item-status-utils";
import { DEFAULT_KANBAN_STATUSES } from "@/app/_consts/kanban";
import { TaskStatus } from "@/app/_types/enums";
import { Item } from "@/app/_types";

const makeItem = (id: string, status?: string, extra?: Partial<Item>): Item => ({
  id,
  text: id,
  completed: false,
  order: 0,
  status,
  ...extra,
});

const NOW = "2026-06-12T12:00:00.000Z";
const USER = "samwise";

describe("applyStatus", () => {
  it("sets status, modifier metadata, and appends history", () => {
    const items = [makeItem("a", TaskStatus.TODO)];
    const result = applyStatus(
      items, "a", TaskStatus.IN_PROGRESS, DEFAULT_KANBAN_STATUSES, USER, NOW,
    );
    expect(result[0].status).toBe(TaskStatus.IN_PROGRESS);
    expect(result[0].lastModifiedBy).toBe(USER);
    expect(result[0].lastModifiedAt).toBe(NOW);
    expect(result[0].history).toEqual([
      { status: TaskStatus.IN_PROGRESS, timestamp: NOW, user: USER },
    ]);
  });

  it("does not append history when the status is unchanged", () => {
    const items = [makeItem("a", TaskStatus.TODO)];
    const result = applyStatus(
      items, "a", TaskStatus.TODO, DEFAULT_KANBAN_STATUSES, USER, NOW,
    );
    expect(result[0].history).toBeUndefined();
  });

  it("completes the item and its children on an autoComplete status", () => {
    const items = [
      makeItem("a", TaskStatus.TODO, {
        children: [makeItem("a1"), makeItem("a2")],
      }),
    ];
    const result = applyStatus(
      items, "a", TaskStatus.COMPLETED, DEFAULT_KANBAN_STATUSES, USER, NOW,
    );
    expect(result[0].completed).toBe(true);
    expect(result[0].children?.every((c) => c.completed)).toBe(true);
  });

  it("clears completed when leaving an autoComplete status", () => {
    const items = [
      makeItem("a", TaskStatus.COMPLETED, { completed: true }),
    ];
    const result = applyStatus(
      items, "a", TaskStatus.PAUSED, DEFAULT_KANBAN_STATUSES, USER, NOW,
    );
    expect(result[0].completed).toBe(false);
  });
});

describe("completeParent", () => {
  it("completes the parent when all children are completed", () => {
    const items = [
      makeItem("p", TaskStatus.IN_PROGRESS, {
        children: [
          makeItem("c1", TaskStatus.COMPLETED, { completed: true }),
          makeItem("c2", TaskStatus.COMPLETED, { completed: true }),
        ],
      }),
    ];
    const result = completeParent(
      items, "c1", DEFAULT_KANBAN_STATUSES, USER, NOW,
    );
    expect(result[0].completed).toBe(true);
    expect(result[0].status).toBe(TaskStatus.COMPLETED);
    expect(result[0].history).toEqual([
      { status: TaskStatus.COMPLETED, timestamp: NOW, user: USER },
    ]);
  });

  it("does nothing while a sibling is incomplete", () => {
    const items = [
      makeItem("p", TaskStatus.IN_PROGRESS, {
        children: [
          makeItem("c1", TaskStatus.COMPLETED, { completed: true }),
          makeItem("c2", TaskStatus.TODO),
        ],
      }),
    ];
    const result = completeParent(
      items, "c1", DEFAULT_KANBAN_STATUSES, USER, NOW,
    );
    expect(result[0].completed).toBe(false);
  });

  it("does nothing without an autoComplete status", () => {
    const noAutoComplete = DEFAULT_KANBAN_STATUSES.map((s) => ({
      ...s,
      autoComplete: false,
    }));
    const items = [
      makeItem("p", TaskStatus.IN_PROGRESS, {
        children: [makeItem("c1", TaskStatus.COMPLETED, { completed: true })],
      }),
    ];
    const result = completeParent(items, "c1", noAutoComplete, USER, NOW);
    expect(result[0].completed).toBe(false);
  });

  it("does nothing for a top-level item", () => {
    const items = [makeItem("a", TaskStatus.COMPLETED, { completed: true })];
    const result = completeParent(
      items, "a", DEFAULT_KANBAN_STATUSES, USER, NOW,
    );
    expect(result).toBe(items);
  });
});
