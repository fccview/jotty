import { Item } from "@/app/_types";
import { toDateKey, toLocalDateKey } from "@/app/_utils/kanban/calendar-utils";

export const getDueReminders = (items: Item[]): Item[] =>
  items.filter((item) => {
    if (!item.reminder || item.reminder.notified || item.isArchived) return false;
    return new Date(item.reminder.datetime) <= new Date();
  });

export const formatReminderTime = (datetime: string): string => {
  const date = new Date(datetime);
  const now = new Date();
  const diff = date.getTime() - now.getTime();

  if (diff < 0) return "Overdue";
  if (diff < 60000) return "Due now";
  if (diff < 3600000) return `In ${Math.ceil(diff / 60000)}m`;
  if (diff < 86400000) return `In ${Math.ceil(diff / 3600000)}h`;
  return date.toLocaleDateString();
};

const _endOfDay = (dateStr: string): Date => {
  const [year, month, day] = toDateKey(dateStr).split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999);
};

export const isOverdue = (item: Item): boolean => {
  if (!item.targetDate) return false;
  return _endOfDay(item.targetDate) < new Date() && !item.completed;
};

export const isDueToday = (item: Item): boolean => {
  if (!item.targetDate) return false;
  return toDateKey(item.targetDate) === toLocalDateKey(new Date()) && !item.completed;
};

export const isDueThisWeek = (item: Item): boolean => {
  if (!item.targetDate) return false;
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));
  weekEnd.setHours(23, 59, 59, 999);
  const target = _endOfDay(item.targetDate);
  return target >= now && target <= weekEnd && !item.completed;
};
