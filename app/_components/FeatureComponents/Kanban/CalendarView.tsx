"use client";

import { Checklist, Item } from "@/app/_types";
import { useCalendarView } from "@/app/_hooks/kanban/useCalendarView";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar03Icon,
  Download04Icon,
} from "hugeicons-react";
import { cn } from "@/app/_utils/global-utils";
import { getPriorityBarStyle } from "@/app/_utils/kanban/index";
import {
  getMaxBarLanes,
  getWeekBarSegments,
} from "@/app/_utils/kanban/calendar-utils";
import { useTranslations } from "next-intl";

interface CalendarViewProps {
  checklist: Checklist;
  onItemClick?: (item: Item) => void;
}

const _getWeekdays = (t: (key: string) => string) => [
  t("kanban.weekdaysSun"),
  t("kanban.weekdaysMon"),
  t("kanban.weekdaysTue"),
  t("kanban.weekdaysWed"),
  t("kanban.weekdaysThu"),
  t("kanban.weekdaysFri"),
  t("kanban.weekdaysSat"),
];

const _toLocalDate = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const _BAR_HEIGHT = 18;

export const CalendarView = ({ checklist, onItemClick }: CalendarViewProps) => {
  const t = useTranslations();
  const {
    currentDate,
    calendarGrid,
    events,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    exportICS,
    unscheduledItems,
  } = useCalendarView(checklist);

  const weekdays = _getWeekdays(t);
  const today = _toLocalDate(new Date());
  const monthLabel = currentDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const _openItem = (itemId: string) => {
    const item = checklist.items.find((entry) => entry.id === itemId);
    if (item && onItemClick) onItemClick(item);
  };

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <Button variant="outline" size="sm" onClick={goToPreviousMonth} className="shrink-0">
            <ArrowLeft01Icon className="h-4 w-4" />
          </Button>
          <h3 className="text-base sm:text-lg font-semibold min-w-0 flex-1 text-center truncate px-1">
            {monthLabel}
          </h3>
          <Button variant="outline" size="sm" onClick={goToNextMonth} className="shrink-0">
            <ArrowRight01Icon className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday} className="shrink-0">
            {t("kanban.today")}
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={exportICS} className="shrink-0 w-full sm:w-auto">
          <Download04Icon className="h-4 w-4 mr-1" />
          {t("kanban.exportIcs")}
        </Button>
      </div>

      <div className="border border-border rounded-jotty overflow-hidden min-w-0">
        <div className="grid grid-cols-7 min-w-0">
          {weekdays.map((day) => (
            <div
              key={day}
              className="p-2 text-center text-xs font-medium text-muted-foreground bg-muted border-b border-border"
            >
              {day}
            </div>
          ))}
        </div>

        {calendarGrid.map((week, weekIndex) => {
          const segments = getWeekBarSegments(week, events);
          const maxLanes = getMaxBarLanes(segments);
          const barAreaHeight = maxLanes * _BAR_HEIGHT;

          return (
            <div key={weekIndex} className="relative grid grid-cols-7">
              {week.map((day, dayIndex) => {
                if (!day) {
                  return (
                    <div
                      key={`empty-${dayIndex}`}
                      className="border-b border-r border-border bg-muted/20"
                      style={{ minHeight: 72 + barAreaHeight }}
                    />
                  );
                }

                const dateStr = _toLocalDate(day);
                const isToday = dateStr === today;

                return (
                  <div
                    key={dateStr}
                    className={cn(
                      "border-b border-r border-border p-1 transition-colors",
                      isToday && "bg-primary/5",
                    )}
                    style={{ minHeight: 72 + barAreaHeight }}
                  >
                    <div
                      className={cn(
                        "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                        isToday && "bg-primary text-primary-foreground",
                      )}
                    >
                      {day.getDate()}
                    </div>
                  </div>
                );
              })}

              {maxLanes > 0 && (
                <div
                  className="absolute inset-x-0 top-7 grid grid-cols-7 gap-y-0.5 px-0.5 pointer-events-none"
                  style={{ gridTemplateRows: `repeat(${maxLanes}, ${_BAR_HEIGHT}px)` }}
                >
                  {segments.map((segment) => {
                    const barStyle = getPriorityBarStyle(
                      segment.event.priority as Parameters<typeof getPriorityBarStyle>[0],
                    );

                    return (
                    <div
                      key={`${segment.event.id}-${segment.colStart}-${segment.lane}`}
                      role="button"
                      tabIndex={0}
                      aria-label={segment.event.title}
                      onClick={() => _openItem(segment.event.itemId)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          _openItem(segment.event.itemId);
                        }
                      }}
                      className={cn(
                        "pointer-events-auto h-4 text-[10px] font-medium leading-4 px-1.5 truncate cursor-pointer hover:brightness-95 dark:hover:brightness-110 transition-[filter,opacity]",
                        !barStyle.backgroundColor && "bg-muted/80 text-muted-foreground",
                        segment.continuesPrev ? "rounded-l-none ml-0" : "rounded-l-jotty ml-0.5",
                        segment.continuesNext ? "rounded-r-none mr-0" : "rounded-r-jotty mr-0.5",
                        segment.event.completed && "line-through opacity-70",
                      )}
                      style={{
                        ...barStyle,
                        gridColumn: `${segment.colStart + 1} / span ${segment.colSpan}`,
                        gridRow: segment.lane + 1,
                      }}
                    >
                      {!segment.continuesPrev ? segment.event.title : "\u00a0"}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {unscheduledItems.length > 0 && (
        <div className="border border-border rounded-jotty p-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <Calendar03Icon className="h-4 w-4" />
            {t("kanban.unscheduled", { count: unscheduledItems.length })}
          </h4>
          <div className="flex flex-wrap gap-2">
            {unscheduledItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onItemClick?.(item)}
                className="text-xs px-2 py-1 rounded-jotty border border-border bg-muted/30 text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
              >
                {item.text}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
