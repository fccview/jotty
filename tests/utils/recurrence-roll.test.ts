import { describe, it, expect } from "vitest";
import { Item } from "@/app/_types";
import { TaskStatus } from "@/app/_types/enums";
import { RRule } from "rrule";
import {
  calculateNextOccurrence,
  hasDueRecurringItem,
  isoToRFC5545,
  refreshRecurringItem,
  rollDueItems,
  shouldRefreshRecurringItem,
} from "@/app/_utils/recurrence-utils";

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

  it("sends a completed card and its subtasks back to the board's first column", () => {
    const statuses = [
      { id: "backlog", label: "Backlog", order: 0 },
      { id: "shipped", label: "Shipped", order: 1, autoComplete: true },
    ];
    const subtask = item({ id: "sub", status: "shipped", completed: true, recurrence: undefined });
    const [rolled] = rollDueItems([item({ status: "shipped", completed: true, children: [subtask] })], statuses);

    expect(rolled.status).toBe("backlog");
    expect(rolled.children?.[0].status).toBe("backlog");
    expect(rolled.children?.[0].completed).toBe(false);
  });

  it("keeps a paused card paused when it rolls", () => {
    expect(refreshRecurringItem(item({ status: TaskStatus.PAUSED, completed: true })).status).toBe(TaskStatus.PAUSED);
  });

  it("rolls a due recurring item nested under a parent that is not due", () => {
    const child = item({ id: "child", completed: true });
    const parent = item({ id: "parent", recurrence: undefined, children: [child] });
    const untouched = item({ id: "plain", recurrence: undefined });

    expect(hasDueRecurringItem([parent])).toBe(true);
    const [rolledParent, same] = rollDueItems([parent, untouched]);

    expect(rolledParent).not.toBe(parent);
    expect(rolledParent.children?.[0].completed).toBe(false);
    expect(same).toBe(untouched);
  });

  it("only touches the items that are due", () => {
    const waiting = item({ id: "waiting" });
    const due = item({ id: "due", completed: true });
    const [first, second] = rollDueItems([waiting, due]);

    expect(first).toBe(waiting);
    expect(second.completed).toBe(false);
  });
});

describe("finding the next occurrence", () => {
  it("still walks a daily series that started decades ago", () => {
    const next = calculateNextOccurrence("FREQ=DAILY", "1970-01-01T09:00:00.000Z");

    expect(next).toBeDefined();
    expect(new Date(next!).getTime()).toBeGreaterThan(Date.now());
  });

  it("refuses rules that repeat more than daily or never move forward, instead of blocking the server", () => {
    const upTo = (count: number) => Array.from({ length: count }, (_, index) => index).join(",");
    const everyMinute = `FREQ=DAILY;BYHOUR=${upTo(24)};BYMINUTE=${upTo(60)}`;

    expect(calculateNextOccurrence("FREQ=SECONDLY", "1970-01-01T00:00:00.000Z")).toBeUndefined();
    expect(calculateNextOccurrence(everyMinute, "1970-01-01T00:00:00.000Z")).toBeUndefined();
    expect(calculateNextOccurrence("FREQ=DAILY;INTERVAL=-1", "2020-01-01T00:00:00.000Z")).toBeUndefined();
    expect(calculateNextOccurrence("FREQ=DAILY;INTERVAL=0", "2020-01-01T00:00:00.000Z")).toBeUndefined();
  });

  it("finds the same next date as walking the whole series", () => {
    const rules = ["FREQ=DAILY", "FREQ=DAILY;INTERVAL=3", "FREQ=WEEKLY;INTERVAL=2", "FREQ=WEEKLY;INTERVAL=3;BYDAY=MO,TH", "FREQ=WEEKLY;BYDAY=SU,SA;WKST=SU"];
    const starts = ["2019-03-31T23:30:00.000Z", "2020-02-29T07:15:00.000Z", "1990-06-15T09:00:00.000Z"];
    const afters = ["2026-03-29T00:59:59.000Z", "2027-01-01T00:00:00.000Z"];

    for (const rule of rules) {
      for (const start of starts) {
        for (const after of afters) {
          const walked = RRule.fromString(`DTSTART:${isoToRFC5545(start)}\nRRULE:${rule}`).after(new Date(after), false);
          expect(calculateNextOccurrence(rule, start, new Date(after)), `${rule} from ${start} after ${after}`).toBe(
            walked?.toISOString(),
          );
        }
      }
    }
  });
});

describe("rolling a series it can't work out", () => {
  it("rolls a series that started centuries ago", () => {
    const ancient = item({ completed: true, recurrence: { ...weekly(PAST), rrule: "FREQ=DAILY", dtstart: "1800-01-01T09:00:00.000Z" } });
    const rolled = refreshRecurringItem(ancient);

    expect(rolled.completed).toBe(false);
    expect(new Date(rolled.recurrence!.nextDue!).getTime()).toBeGreaterThan(Date.now());
  });

  it("keeps the item as it is when the date can't be read", () => {
    const unreadable = item({ completed: true, recurrence: { ...weekly(PAST), rrule: "FREQ=MONTHLY", dtstart: "0999-01-01T00:00:00Z" } });

    expect(refreshRecurringItem(unreadable)).toBe(unreadable);
  });

  it("opens the last occurrence once, then keeps the finished series completed", () => {
    const once = item({ completed: true, recurrence: { ...weekly(PAST), rrule: "FREQ=DAILY;COUNT=1" } });
    const last = refreshRecurringItem(once);

    expect(last.completed).toBe(false);
    expect(last.recurrence?.nextDue).toBeUndefined();

    const finished = { ...last, completed: true };
    expect(shouldRefreshRecurringItem(finished)).toBe(false);
    expect(rollDueItems([finished])[0]).toBe(finished);
  });

  it("opens the second occurrence of a two-day series once it is due", () => {
    const twoDays = { rrule: "FREQ=DAILY;COUNT=2", dtstart: "2020-01-06T09:00:00.000Z", nextDue: "2020-01-07T09:00:00.000Z" };
    const [second] = rollDueItems([item({ completed: true, recurrence: twoDays })]);

    expect(second.completed).toBe(false);
    expect(second.recurrence?.nextDue).toBeUndefined();
  });

  it("clears nextDue without reopening when the stored occurrence is not due yet", () => {
    const later = item({ completed: true, recurrence: { ...weekly(FUTURE), rrule: "FREQ=DAILY;COUNT=1" } });
    const kept = refreshRecurringItem(later);

    expect(kept.completed).toBe(true);
    expect(kept.recurrence?.nextDue).toBeUndefined();
  });

  it("never tries to roll a stored rule that could hang the search", () => {
    const backwards = item({ completed: true, recurrence: { ...weekly(PAST), rrule: "FREQ=DAILY;INTERVAL=-1" } });

    expect(shouldRefreshRecurringItem(backwards)).toBe(false);
  });
});
