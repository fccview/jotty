import { describe, it, expect } from "vitest";
import { Item } from "@/app/_types";
import { TaskStatus } from "@/app/_types/enums";
import { refreshRecurringItem, rollDueItems, shouldRefreshRecurringItem } from "@/app/_utils/recurrence-utils";

const PAST = "2020-01-06T09:00:00.000Z";
const FUTURE = "2999-01-06T09:00:00.000Z";

const weekly = (nextDue: string) => ({
  rrule: "FREQ=WEEKLY;INTERVAL=1",
  dtstart: "2020-01-06T09:00:00.000Z",
  nextDue,
});

const item = (overrides: Partial<Item> = {}): Item => ({
  id: "bins",
  text: "Take the bins out",
  completed: false,
  order: 0,
  recurrence: weekly(PAST),
  ...overrides,
});

describe("which recurring items roll", () => {
  it("leaves an unticked simple item alone even when it is overdue", () => {
    expect(shouldRefreshRecurringItem(item())).toBe(false);
  });

  it("rolls a ticked simple item once it is due", () => {
    expect(shouldRefreshRecurringItem(item({ completed: true }))).toBe(true);
  });

  it("waits for the next occurrence before rolling a ticked item", () => {
    expect(shouldRefreshRecurringItem(item({ completed: true, recurrence: weekly(FUTURE) }))).toBe(false);
  });

  it("keeps an overdue card that is in progress where it is", () => {
    expect(shouldRefreshRecurringItem(item({ status: TaskStatus.IN_PROGRESS }))).toBe(false);
    expect(shouldRefreshRecurringItem(item({ status: "review" }))).toBe(false);
  });

  it("rolls a card in a completed column, including old cards without the completed flag", () => {
    expect(shouldRefreshRecurringItem(item({ status: "done", completed: true }))).toBe(true);
    expect(shouldRefreshRecurringItem(item({ status: TaskStatus.COMPLETED }))).toBe(true);
  });

  it("stops rolling once the series has ended", () => {
    const ended = { ...weekly(PAST), until: "2020-02-01T00:00:00.000Z" };
    expect(shouldRefreshRecurringItem(item({ completed: true, recurrence: ended }))).toBe(false);
  });
});

describe("rolling an item", () => {
  it("does not give a simple item a status it never had", () => {
    const rolled = refreshRecurringItem(item({ completed: true }));

    expect(rolled.completed).toBe(false);
    expect(rolled.status).toBeUndefined();
    expect(rolled.recurrence?.lastCompleted).toBeDefined();
  });

  it("sends a completed card back to todo", () => {
    expect(refreshRecurringItem(item({ status: TaskStatus.COMPLETED, completed: true })).status).toBe(TaskStatus.TODO);
  });

  it("only touches the items that are due", () => {
    const waiting = item({ id: "waiting" });
    const due = item({ id: "due", completed: true });
    const [first, second] = rollDueItems([waiting, due]);

    expect(first).toBe(waiting);
    expect(second.completed).toBe(false);
  });
});
