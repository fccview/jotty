import { Item } from "@/app/_types";

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

export const isOverdue = (item: Item): boolean => {
  if (!item.targetDate) return false;
  return new Date(item.targetDate) < new Date() && !item.completed;
};

export const isDueToday = (item: Item): boolean => {
  if (!item.targetDate) return false;
  const today = new Date().toISOString().split("T")[0];
  return item.targetDate.startsWith(today) && !item.completed;
};

export const isDueThisWeek = (item: Item): boolean => {
  if (!item.targetDate) return false;
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));
  const target = new Date(item.targetDate);
  return target >= now && target <= weekEnd && !item.completed;
};
