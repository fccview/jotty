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
import { getPriorityColor } from "@/app/_utils/kanban/index";
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

export const CalendarView = ({ checklist, onItemClick }: CalendarViewProps) => {
  const t = useTranslations();
  const {
    currentDate,
    calendarGrid,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    exportICS,
    getEventsForDate,
    unscheduledItems,
  } = useCalendarView(checklist);

  const weekdays = _getWeekdays(t);
  const today = _toLocalDate(new Date());
  const monthLabel = currentDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
            <ArrowLeft01Icon className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold min-w-[200px] text-center">
            {monthLabel}
          </h3>
          <Button variant="outline" size="sm" onClick={goToNextMonth}>
            <ArrowRight01Icon className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            {t("kanban.today")}
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={exportICS}>
          <Download04Icon className="h-4 w-4 mr-1" />
          {t("kanban.exportIcs")}
        </Button>
      </div>

      <div className="border border-border rounded-jotty overflow-hidden">
        <div className="grid grid-cols-7">
          {weekdays.map((day) => (
            <div
              key={day}
              className="p-2 text-center text-xs font-medium text-muted-foreground bg-muted border-b border-border"
            >
              {day}
            </div>
          ))}
        </div>

        {calendarGrid.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7">
            {week.map((day, dayIndex) => {
              if (!day) {
                return (
                  <div
                    key={`empty-${dayIndex}`}
                    className="min-h-[100px] p-1 border-b border-r border-border bg-muted/20"
                  />
                );
              }

              const dateStr = _toLocalDate(day);
              const dayEvents = getEventsForDate(day);
              const isToday = dateStr === today;

              return (
                <div
                  key={dateStr}
                  className={cn(
                    "min-h-[100px] p-1 border-b border-r border-border transition-colors",
                    isToday && "bg-primary/5"
                  )}
                >
                  <div
                    className={cn(
                      "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                      isToday && "bg-primary text-primary-foreground"
                    )}
                  >
                    {day.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        onClick={() => {
                          const item = checklist.items.find((i) => i.id === event.itemId);
                          if (item && onItemClick) onItemClick(item);
                        }}
                        className={cn(
                          "text-[10px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity",
                          event.completed
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 line-through"
                            : event.priority
                              ? getPriorityColor(event.priority as any)
                              : "bg-primary/10 text-primary"
                        )}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-muted-foreground px-1">
                        {t("kanban.moreEvents", { count: dayEvents.length - 3 })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
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
                className="text-xs px-2 py-1 rounded-full border border-border bg-muted/30 text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
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
