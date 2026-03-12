import { Item, KanbanStatus } from "@/app/_types";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  status?: string;
  priority?: string;
  completed: boolean;
  itemId: string;
}

export const parseItemsForCalendar = (items: Item[]): CalendarEvent[] =>
  items
    .filter((item) => item.targetDate && !item.isArchived)
    .map((item) => ({
      id: item.id,
      title: item.text,
      date: item.targetDate!,
      status: item.status,
      priority: item.priority,
      completed: item.completed,
      itemId: item.id,
    }));

const _escapeICS = (text: string): string =>
  text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

const _formatICSDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
};

export const generateVEVENT = (item: Item, boardTitle: string): string => {
  if (!item.targetDate) return "";

  const dtstart = _formatICSDate(item.targetDate);
  const dtend = _formatICSDate(
    new Date(new Date(item.targetDate).getTime() + 3600000).toISOString()
  );
  const now = _formatICSDate(new Date().toISOString());

  const lines = [
    "BEGIN:VEVENT",
    `UID:${item.id}@jotty`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${_escapeICS(item.text)}`,
    `DESCRIPTION:${_escapeICS(`Board: ${boardTitle}${item.description ? `\\n${item.description}` : ""}`)}`,
    item.status ? `STATUS:${item.completed ? "COMPLETED" : "NEEDS-ACTION"}` : "",
    "END:VEVENT",
  ];

  return lines.filter(Boolean).join("\r\n");
};

export const generateICS = (items: Item[], boardTitle: string): string => {
  const events = items
    .filter((item) => item.targetDate && !item.isArchived)
    .map((item) => generateVEVENT(item, boardTitle))
    .filter(Boolean);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Jotty//Kanban//EN",
    `X-WR-CALNAME:${_escapeICS(boardTitle)}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
};

export const getItemsGroupedByDate = (items: Item[]): Record<string, Item[]> => {
  const grouped: Record<string, Item[]> = {};

  items
    .filter((item) => item.targetDate && !item.isArchived)
    .forEach((item) => {
      const date = item.targetDate!.split("T")[0];
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(item);
    });

  return grouped;
};

export const getDaysInMonth = (year: number, month: number): Date[] => {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

export const getCalendarGrid = (year: number, month: number): (Date | null)[][] => {
  const days = getDaysInMonth(year, month);
  const firstDay = days[0].getDay();
  const grid: (Date | null)[][] = [];
  let week: (Date | null)[] = new Array(firstDay).fill(null);

  days.forEach((day) => {
    week.push(day);
    if (week.length === 7) {
      grid.push(week);
      week = [];
    }
  });

  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    grid.push(week);
  }

  return grid;
};
