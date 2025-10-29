"use client";

import { useState, useMemo, useEffect, MouseEvent } from "react";

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isInRange: boolean;
  isRangeStart: boolean;
  isRangeEnd: boolean;
  isDisabled: boolean;
}

export interface UseCalendarProps {
  selectedDate?: Date;
  selectedRange?: { start: Date; end?: Date };
  onDateSelect?: (date: Date) => void;
  onRangeSelect?: (start: Date, end?: Date) => void;
  mode?: "single" | "range";
  minDate?: Date;
  maxDate?: Date;
  initialDate?: Date;
}

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function useCalendar({
  selectedDate,
  selectedRange,
  onDateSelect,
  onRangeSelect,
  mode = "single",
  minDate,
  maxDate,
  initialDate,
}: UseCalendarProps) {
  const [displayDate, setDisplayDate] = useState(
    initialDate || selectedDate || new Date()
  );

  const [rangeStart, setRangeStart] = useState<Date | undefined>(
    selectedRange?.start
  );

  useEffect(() => {
    setRangeStart(selectedRange?.start);
  }, [selectedRange?.start]);

  const currentMonth = displayDate.getMonth();
  const currentYear = displayDate.getFullYear();

  /**
   * Generates the 42-day grid for the calendar.
   */
  const days = useMemo((): CalendarDay[] => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let firstDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (firstDayOfWeek === -1) firstDayOfWeek = 6;

    const daysInMonth = lastDayOfMonth.getDate();
    const calendarDays: CalendarDay[] = [];

    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(
        currentYear,
        currentMonth - 1,
        prevMonthLastDay - i
      );
      calendarDays.push(createCalendarDay(date, false));
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      calendarDays.push(createCalendarDay(date, true));
    }

    const remainingCells = 42 - calendarDays.length;
    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(currentYear, currentMonth + 1, day);
      calendarDays.push(createCalendarDay(date, false));
    }

    return calendarDays;

    /**
     * Helper to create a CalendarDay object with all its states.
     */
    function createCalendarDay(
      date: Date,
      isCurrentMonth: boolean
    ): CalendarDay {
      const dateWithoutTime = new Date(date);
      dateWithoutTime.setHours(0, 0, 0, 0);

      const isToday = dateWithoutTime.getTime() === today.getTime();

      let isSelected = false;
      let isInRange = false;
      let isRangeStart = false;
      let isRangeEnd = false;

      if (mode === "single" && selectedDate) {
        const selectedWithoutTime = new Date(selectedDate);
        selectedWithoutTime.setHours(0, 0, 0, 0);
        isSelected =
          dateWithoutTime.getTime() === selectedWithoutTime.getTime();
      } else if (mode === "range" && selectedRange) {
        const startWithoutTime = new Date(selectedRange.start);
        startWithoutTime.setHours(0, 0, 0, 0);

        isRangeStart = dateWithoutTime.getTime() === startWithoutTime.getTime();

        if (selectedRange.end) {
          const endWithoutTime = new Date(selectedRange.end);
          endWithoutTime.setHours(0, 0, 0, 0);
          isRangeEnd = dateWithoutTime.getTime() === endWithoutTime.getTime();
          isInRange =
            dateWithoutTime >= startWithoutTime &&
            dateWithoutTime <= endWithoutTime;
        } else if (rangeStart) {
          const tempStart = new Date(rangeStart);
          tempStart.setHours(0, 0, 0, 0);
          isInRange = dateWithoutTime >= tempStart;
        }
      }

      let isDisabled = false;
      if (minDate) {
        const minWithoutTime = new Date(minDate);
        minWithoutTime.setHours(0, 0, 0, 0);
        if (dateWithoutTime < minWithoutTime) isDisabled = true;
      }
      if (maxDate) {
        const maxWithoutTime = new Date(maxDate);
        maxWithoutTime.setHours(0, 0, 0, 0);
        if (dateWithoutTime > maxWithoutTime) isDisabled = true;
      }

      return {
        date: dateWithoutTime,
        isCurrentMonth,
        isToday,
        isSelected,
        isInRange,
        isRangeStart,
        isRangeEnd,
        isDisabled,
      };
    }
  }, [
    currentMonth,
    currentYear,
    selectedDate,
    selectedRange,
    mode,
    minDate,
    maxDate,
    rangeStart,
  ]);

  const handlePreviousMonth = () => {
    setDisplayDate(
      (prevDate) => new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setDisplayDate(
      (prevDate) => new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1)
    );
  };

  const handleMonthSelect = (monthIndex: number) => {
    setDisplayDate(
      (prevDate) => new Date(prevDate.getFullYear(), monthIndex, 1)
    );
  };

  const handleYearSelect = (year: number) => {
    setDisplayDate(
      (prevDate) => new Date(year, prevDate.getMonth(), 1)
    );
  };

  const handleDayClick = (day: CalendarDay, event: MouseEvent) => {
    event.stopPropagation();

    if (day.isDisabled) return;

    if (mode === "single") {
      onDateSelect?.(day.date);
    } else if (mode === "range") {
      if (!rangeStart || (rangeStart && selectedRange?.end)) {
        setRangeStart(day.date);
        onRangeSelect?.(day.date, undefined);
      } else {
        if (day.date >= rangeStart) {
          onRangeSelect?.(rangeStart, day.date);
        } else {
          onRangeSelect?.(day.date, rangeStart);
        }
        setRangeStart(undefined);
      }
    }
  };

  return {
    days,
    handlePreviousMonth,
    handleNextMonth,
    handleMonthSelect,
    handleYearSelect,
    handleDayClick,
    monthName: MONTHS[currentMonth],
    year: currentYear,
  };
}
