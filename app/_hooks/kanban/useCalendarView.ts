"use client";

import { useState, useMemo, useCallback } from "react";
import { Item, Checklist } from "@/app/_types";
import {
  parseItemsForCalendar,
  generateICS,
  getCalendarGrid,
  getItemsGroupedByDate,
  CalendarEvent,
} from "@/app/_utils/kanban/calendar-utils";

type CalendarViewMode = "month" | "week" | "day";

export const useCalendarView = (checklist: Checklist) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");

  const events = useMemo(
    () => parseItemsForCalendar(checklist.items),
    [checklist.items]
  );

  const itemsByDate = useMemo(
    () => getItemsGroupedByDate(checklist.items),
    [checklist.items]
  );

  const calendarGrid = useMemo(
    () => getCalendarGrid(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate]
  );

  const unscheduledItems = useMemo(
    () => checklist.items.filter((item) => !item.targetDate && !item.isArchived),
    [checklist.items]
  );

  const _navigateMonth = useCallback((direction: number) => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + direction);
      return next;
    });
  }, []);

  const goToPreviousMonth = useCallback(() => _navigateMonth(-1), [_navigateMonth]);
  const goToNextMonth = useCallback(() => _navigateMonth(1), [_navigateMonth]);
  const goToToday = useCallback(() => setCurrentDate(new Date()), []);

  const exportICS = useCallback(() => {
    const icsContent = generateICS(checklist.items, checklist.title);
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${checklist.title.replace(/[^a-zA-Z0-9]/g, "-")}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [checklist]);

  const getEventsForDate = useCallback(
    (date: Date): CalendarEvent[] => {
      const pad = (n: number) => String(n).padStart(2, "0");
      const localDateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
      return events.filter((e) => {
        const eventDate = new Date(e.date);
        const eventLocalStr = `${eventDate.getFullYear()}-${pad(eventDate.getMonth() + 1)}-${pad(eventDate.getDate())}`;
        return eventLocalStr === localDateStr;
      });
    },
    [events]
  );

  return {
    currentDate,
    viewMode,
    setViewMode,
    events,
    itemsByDate,
    calendarGrid,
    unscheduledItems,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    exportICS,
    getEventsForDate,
  };
};
