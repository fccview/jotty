import { FirstDayOfWeek } from "@/app/_types";

export enum WeekDay {
  SUNDAY = "sunday",
  MONDAY = "monday",
  SATURDAY = "saturday",
}

export const DEFAULT_WEEK_START = WeekDay.SUNDAY;

export const WEEK_START_INDEX: Record<FirstDayOfWeek, number> = {
  [WeekDay.SUNDAY]: 0,
  [WeekDay.MONDAY]: 1,
  [WeekDay.SATURDAY]: 6,
};

export const WEEKDAY_KEYS = [
  "kanban.weekdaysSun",
  "kanban.weekdaysMon",
  "kanban.weekdaysTue",
  "kanban.weekdaysWed",
  "kanban.weekdaysThu",
  "kanban.weekdaysFri",
  "kanban.weekdaysSat",
];

export const rotateWeek = <T>(days: T[], weekStart: number): T[] =>
  days.map((_, index) => days[(index + weekStart) % days.length]);
