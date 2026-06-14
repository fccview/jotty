import { Item, KanbanStatus } from "@/app/_types";

export interface CalendarEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status?: string;
  priority?: string;
  completed: boolean;
  itemId: string;
}

export interface WeekBarSegment {
  event: CalendarEvent;
  colStart: number;
  colSpan: number;
  lane: number;
  continuesPrev: boolean;
  continuesNext: boolean;
}

export const toDateKey = (dateStr: string): string => dateStr.split("T")[0];

export const toLocalDateKey = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const parseItemsForCalendar = (items: Item[]): CalendarEvent[] =>
  items
    .filter((item) => item.targetDate && !item.isArchived)
    .map((item) => {
      const endDate = toDateKey(item.targetDate!);
      const startDate = item.startDate ? toDateKey(item.startDate) : endDate;
      return {
        id: item.id,
        title: item.text,
        startDate: startDate <= endDate ? startDate : endDate,
        endDate: endDate >= startDate ? endDate : startDate,
        status: item.status,
        priority: item.priority,
        completed: item.completed,
        itemId: item.id,
      };
    });

const _escapeICS = (text: string): string =>
  text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

const _formatICSDateTime = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
};

const _addDays = (dateKey: string, days: number): string => {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const generateVEVENT = (item: Item, boardTitle: string): string => {
  if (!item.targetDate) return "";

  const endDate = toDateKey(item.targetDate);
  const startDate = item.startDate ? toDateKey(item.startDate) : endDate;
  const rangeStart = startDate <= endDate ? startDate : endDate;
  const rangeEnd = endDate >= startDate ? endDate : startDate;
  const isMultiDay = rangeStart !== rangeEnd;
  const now = _formatICSDateTime(new Date().toISOString());

  const lines = [
    "BEGIN:VEVENT",
    `UID:${item.id}@jotty`,
    `DTSTAMP:${now}`,
    isMultiDay
      ? `DTSTART;VALUE=DATE:${rangeStart.replace(/-/g, "")}`
      : `DTSTART:${_formatICSDateTime(item.targetDate)}`,
    isMultiDay
      ? `DTEND;VALUE=DATE:${_addDays(rangeEnd, 1).replace(/-/g, "")}`
      : `DTEND:${_formatICSDateTime(new Date(new Date(item.targetDate).getTime() + 3600000).toISOString())}`,
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
      const endDate = toDateKey(item.targetDate!);
      const startDate = item.startDate ? toDateKey(item.startDate) : endDate;
      const rangeStart = startDate <= endDate ? startDate : endDate;
      const rangeEnd = endDate >= startDate ? endDate : startDate;
      let cursor = rangeStart;

      while (cursor <= rangeEnd) {
        if (!grouped[cursor]) grouped[cursor] = [];
        grouped[cursor].push(item);
        cursor = _addDays(cursor, 1);
      }
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

export const getWeekBarSegments = (
  week: (Date | null)[],
  events: CalendarEvent[],
): WeekBarSegment[] => {
  const raw: Omit<WeekBarSegment, "lane">[] = [];

  events.forEach((event) => {
    let colStart = -1;
    let colEnd = -1;

    week.forEach((day, index) => {
      if (!day) return;
      const key = toLocalDateKey(day);
      if (key >= event.startDate && key <= event.endDate) {
        if (colStart === -1) colStart = index;
        colEnd = index;
      }
    });

    if (colStart === -1) return;

    const startKey = toLocalDateKey(week[colStart]!);
    const endKey = toLocalDateKey(week[colEnd]!);

    raw.push({
      event,
      colStart,
      colSpan: colEnd - colStart + 1,
      continuesPrev: startKey > event.startDate,
      continuesNext: endKey < event.endDate,
    });
  });

  raw.sort((a, b) => a.colStart - b.colStart || b.colSpan - a.colSpan);

  const lanes: { start: number; end: number }[][] = [];
  const segments: WeekBarSegment[] = [];

  raw.forEach((segment) => {
    const segmentEnd = segment.colStart + segment.colSpan - 1;
    let lane = 0;

    while (true) {
      if (!lanes[lane]) lanes[lane] = [];
      const blocked = lanes[lane].some(
        (occupied) => !(segmentEnd < occupied.start || segment.colStart > occupied.end),
      );
      if (!blocked) {
        lanes[lane].push({ start: segment.colStart, end: segmentEnd });
        segments.push({ ...segment, lane });
        break;
      }
      lane += 1;
    }
  });

  return segments;
};

export const getMaxBarLanes = (segments: WeekBarSegment[]): number =>
  segments.reduce((max, segment) => Math.max(max, segment.lane + 1), 0);
