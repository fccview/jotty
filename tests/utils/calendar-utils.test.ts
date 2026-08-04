import { describe, it, expect } from "vitest";
import {
  toDateKey,
  toLocalDateKey,
  parseItemsForCalendar,
  getItemsGroupedByDate,
  generateVEVENT,
  getCalendarGrid,
} from "@/app/_utils/kanban/calendar-utils";
import { WEEKDAY_KEYS, WEEK_START_INDEX, WeekDay, rotateWeek } from "@/app/_consts/calendar";
import { isDueToday, isOverdue } from "@/app/_utils/kanban/reminder-utils";
import { Item } from "@/app/_types";

const makeItem = (id: string, extra?: Partial<Item>): Item => ({
  id,
  text: id,
  completed: false,
  order: 0,
  ...extra,
});

describe("toDateKey", () => {
  it("keeps date-only values untouched regardless of timezone", () => {
    expect(toDateKey("2026-07-10")).toBe("2026-07-10");
  });

  it("resolves legacy utc instants to the viewer local day", () => {
    const instant = "2026-07-09T22:00:00.000Z";
    expect(toDateKey(instant)).toBe(toLocalDateKey(new Date(instant)));
  });

  it("falls back to the literal date part for unparseable values", () => {
    expect(toDateKey("not-a-dateTnonsense")).toBe("not-a-date");
  });
});

describe("parseItemsForCalendar", () => {
  it("places a date-only target on the picked day", () => {
    const events = parseItemsForCalendar([
      makeItem("a", { targetDate: "2026-07-10" }),
    ]);
    expect(events[0].startDate).toBe("2026-07-10");
    expect(events[0].endDate).toBe("2026-07-10");
  });

  it("spans start to target when both are set", () => {
    const events = parseItemsForCalendar([
      makeItem("a", { startDate: "2026-07-08", targetDate: "2026-07-10" }),
    ]);
    expect(events[0].startDate).toBe("2026-07-08");
    expect(events[0].endDate).toBe("2026-07-10");
  });
});

describe("getItemsGroupedByDate", () => {
  it("groups a date-only target under the same day", () => {
    const grouped = getItemsGroupedByDate([
      makeItem("a", { targetDate: "2026-07-10" }),
    ]);
    expect(Object.keys(grouped)).toEqual(["2026-07-10"]);
  });
});

describe("generateVEVENT", () => {
  it("emits an all-day event for a date-only target", () => {
    const ics = generateVEVENT(makeItem("a", { targetDate: "2026-07-10" }), "Board");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260710");
    expect(ics).toContain("DTEND;VALUE=DATE:20260711");
  });
});

describe("getCalendarGrid", () => {
  it("pads to sunday by default", () => {
    const grid = getCalendarGrid(2026, 6);
    expect(grid[0].slice(0, 4).map((day) => day && day.getDate())).toEqual([
      null,
      null,
      null,
      1,
    ]);
  });

  it("pads to the configured week start", () => {
    const monday = getCalendarGrid(2026, 6, WEEK_START_INDEX[WeekDay.MONDAY]);
    expect(monday[0].slice(0, 3).map((day) => day && day.getDate())).toEqual([null, null, 1]);

    const saturday = getCalendarGrid(2026, 6, WEEK_START_INDEX[WeekDay.SATURDAY]);
    expect(saturday[0].slice(0, 5).map((day) => day && day.getDate())).toEqual([
      null,
      null,
      null,
      null,
      1,
    ]);
  });

  it("keeps every day of the month in the grid", () => {
    [0, 1, 6].forEach((weekStart) => {
      const days = getCalendarGrid(2026, 6, weekStart)
        .flat()
        .filter(Boolean)
        .map((day) => day!.getDate());
      expect(days).toEqual(Array.from({ length: 31 }, (_, i) => i + 1));
    });
  });
});

describe("rotateWeek", () => {
  it("reorders weekday labels from the chosen start", () => {
    expect(rotateWeek(WEEKDAY_KEYS, WEEK_START_INDEX[WeekDay.MONDAY])[0]).toBe(
      "kanban.weekdaysMon",
    );
    expect(rotateWeek(WEEKDAY_KEYS, WEEK_START_INDEX[WeekDay.SATURDAY])[0]).toBe(
      "kanban.weekdaysSat",
    );
    expect(rotateWeek(WEEKDAY_KEYS, WEEK_START_INDEX[WeekDay.SUNDAY])).toEqual(WEEKDAY_KEYS);
  });
});

describe("reminder helpers", () => {
  it("treats today as due today, not overdue", () => {
    const today = toLocalDateKey(new Date());
    const item = makeItem("a", { targetDate: today });
    expect(isDueToday(item)).toBe(true);
    expect(isOverdue(item)).toBe(false);
  });

  it("flags a past date as overdue", () => {
    expect(isOverdue(makeItem("a", { targetDate: "2020-01-01" }))).toBe(true);
  });
});
