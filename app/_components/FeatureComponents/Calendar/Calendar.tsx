"use client";

import { ArrowRight01Icon, ArrowLeft01Icon } from "hugeicons-react";
import {
  useCalendar,
  UseCalendarProps,
  MONTHS,
} from "@/app/_hooks/useCalendar";
import { cn } from "@/app/_utils/global-utils";

export interface CalendarProps extends UseCalendarProps {
  className?: string;
}

const DAYS_OF_WEEK = ["M", "T", "W", "T", "F", "S", "S"];

const MONTH_OPTIONS = MONTHS.map((month, index) => ({
  id: index,
  name: month,
}));

const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => {
  const currentYear = new Date().getFullYear();
  return currentYear + i;
});

export default function Calendar(props: CalendarProps) {
  const { className = "", ...calendarProps } = props;

  const {
    days,
    handlePreviousMonth,
    handleNextMonth,
    handleMonthSelect,
    handleYearSelect,
    handleDayClick,
    monthName,
    year,
  } = useCalendar(calendarProps);

  return (
    <div className={className}>
      <div className="w-full max-w-md mx-auto">
        <div className="text-center">
          <div className="flex items-center text-foreground">
            <button
              type="button"
              onClick={handlePreviousMonth}
              className="-m-1.5 flex flex-none items-center justify-center p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="sr-only">Previous month</span>
              <ArrowLeft01Icon aria-hidden="true" className="size-5" />
            </button>
            <div className="flex-auto flex items-center justify-center gap-2">
              <select
                value={MONTHS.indexOf(monthName)}
                onChange={(e) => handleMonthSelect(parseInt(e.target.value))}
                className="bg-transparent text-sm font-semibold border-none outline-none cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5"
              >
                {MONTH_OPTIONS.map((month) => (
                  <option key={month.id} value={month.id}>
                    {month.name}
                  </option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => handleYearSelect(parseInt(e.target.value))}
                className="bg-transparent text-sm font-semibold border-none outline-none cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5"
              >
                {YEAR_OPTIONS.map((yearOption) => (
                  <option key={yearOption} value={yearOption}>
                    {yearOption}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="-m-1.5 flex flex-none items-center justify-center p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="sr-only">Next month</span>
              <ArrowRight01Icon aria-hidden="true" className="size-5" />
            </button>
          </div>

          <div className="mt-6 grid grid-cols-7 text-xs/6 text-muted-foreground">
            {DAYS_OF_WEEK.map((day, index) => (
              <div key={index}>{day}</div>
            ))}
          </div>

          <div className="isolate mt-2 grid grid-cols-7 gap-px rounded-lg bg-border text-sm shadow-sm ring-1 ring-border dark:shadow-none">
            {days.map((day, index) => {
              const isFirstInRow = index % 7 === 0;
              const isLastInRow = index % 7 === 6;
              const isFirstRow = index < 7;
              const isLastRow = index >= 35;

              return (
                <button
                  key={day.date.toISOString()}
                  type="button"
                  onClick={(e) => handleDayClick(day, e)}
                  disabled={day.isDisabled}
                  className={cn(
                    "py-1.5 focus:z-10 transition-colors relative",
                    !day.isCurrentMonth ? "bg-muted" : "bg-popover",
                    !day.isCurrentMonth && !day.isSelected && !day.isToday
                      ? "text-muted-foreground"
                      : "",
                    day.isCurrentMonth && !day.isSelected && !day.isToday
                      ? "text-popover-foreground"
                      : "",
                    !day.isDisabled
                      ? "hover:bg-accent"
                      : "opacity-40 cursor-not-allowed",
                    day.isSelected || day.isRangeStart || day.isRangeEnd
                      ? "font-semibold"
                      : "",
                    day.isToday &&
                      !day.isSelected &&
                      !day.isRangeStart &&
                      !day.isRangeEnd
                      ? "font-semibold text-primary"
                      : "",
                    day.isInRange && props.mode === "range" ? "bg-accent" : "",
                    isFirstInRow && isFirstRow ? "rounded-tl-lg" : "",
                    isLastInRow && isFirstRow ? "rounded-tr-lg" : "",
                    isFirstInRow && isLastRow ? "rounded-bl-lg" : "",
                    isLastInRow && isLastRow ? "rounded-br-lg" : ""
                  )}
                >
                  <time
                    dateTime={day.date.toISOString()}
                    className={`
                      mx-auto flex size-7 items-center justify-center rounded-full
                      ${
                        (day.isSelected ||
                          day.isRangeStart ||
                          day.isRangeEnd) &&
                        !day.isToday
                          ? "bg-foreground text-background"
                          : ""
                      }
                      ${
                        (day.isSelected ||
                          day.isRangeStart ||
                          day.isRangeEnd) &&
                        day.isToday
                          ? "bg-primary text-primary-foreground"
                          : ""
                      }
                    `}
                  >
                    {day.date.getDate()}
                  </time>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
