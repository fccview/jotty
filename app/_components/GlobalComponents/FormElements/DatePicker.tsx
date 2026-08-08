"use client";

import { useState, useRef, useEffect, memo } from "react";
import { DayPicker } from "react-day-picker";
import { Calendar03Icon, Clock01Icon } from "hugeicons-react";
import { cn } from "@/app/_utils/global-utils";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useWeekStart } from "@/app/_hooks/useWeekStart";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

const _toDateValue = (dateStr: string): Date | undefined => {
  if (!dateStr) return undefined;
  const dateOnly = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? undefined : d;
};

const _formatDateDisplay = (dateStr: string): string => {
  const d = _toDateValue(dateStr);
  if (!d) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const DatePickerComponent = ({
  value,
  onChange,
  onBlur,
  className,
  placeholder = "Select date",
  disabled,
}: DatePickerProps) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const weekStart = useWeekStart();

  useEffect(() => {
    const _handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        onBlur?.();
      }
    };
    if (open) document.addEventListener("mousedown", _handleClickOutside);
    return () => document.removeEventListener("mousedown", _handleClickOutside);
  }, [open, onBlur]);

  function _handleSelect(day: Date | undefined) {
    if (!day) return;
    const pad = (n: number) => String(n).padStart(2, "0");
    const iso = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
    onChange(iso);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 text-sm bg-background border border-input rounded-jotty focus:outline-none focus:border-ring transition-colors text-left",
          !value && "text-muted-foreground",
          className,
        )}
      >
        <span className="truncate">{value ? _formatDateDisplay(value) : placeholder}</span>
        <Calendar03Icon className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 left-0 bg-popover border border-border rounded-jotty shadow-lg p-3 animate-in fade-in-0 zoom-in-95">
          <DayPicker
            mode="single"
            selected={_toDateValue(value)}
            onSelect={_handleSelect}
            defaultMonth={_toDateValue(value)}
            weekStartsOn={weekStart as 0 | 1 | 2 | 3 | 4 | 5 | 6}
            classNames={{
              root: "text-sm",
              months: "flex flex-col",
              month_caption: "flex justify-center items-center h-8",
              caption_label: "text-sm font-medium text-foreground",
              nav: "flex items-center gap-1",
              button_previous: "absolute left-1 top-3 h-7 w-7 flex items-center justify-center rounded-jotty border border-border hover:bg-muted text-foreground transition-colors",
              button_next: "absolute right-1 top-3 h-7 w-7 flex items-center justify-center rounded-jotty border border-border hover:bg-muted text-foreground transition-colors",
              weekdays: "flex",
              weekday: "w-8 text-center text-xs font-medium text-muted-foreground py-1",
              week: "flex",
              day: "w-8 h-8 text-center text-sm",
              day_button: "w-full h-full flex items-center justify-center rounded-jotty transition-colors hover:bg-muted text-foreground cursor-pointer",
              selected: "rounded-jotty",
              today: "font-bold text-primary",
              outside: "text-muted-foreground/40",
              disabled: "text-muted-foreground/30 cursor-not-allowed",
            }}
          />
        </div>
      )}
    </div>
  );
};

export const DatePicker = memo(DatePickerComponent);

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

const _pad = (n: number) => String(n).padStart(2, "0");

const _formatTimeDisplay = (timeStr: string, format: "12-hours" | "24-hours"): string => {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return "";
  if (format === "24-hours") return `${_pad(h)}:${_pad(m)}`;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${_pad(m)} ${period}`;
};

const TimePickerComponent = ({
  value,
  onChange,
  onBlur,
  className,
  disabled,
  placeholder = "Select time",
}: TimePickerProps) => {
  const { user, appSettings } = useAppMode();
  const userTimeFormat = user?.preferredTimeFormat;
  const resolvedTimeFormat =
    !userTimeFormat || userTimeFormat === "system"
      ? appSettings?.defaultTimeFormat || "12-hours"
      : userTimeFormat;
  const timeFormat = resolvedTimeFormat === "24-hours" ? "24-hours" : "12-hours";
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoursListRef = useRef<HTMLDivElement>(null);
  const minutesListRef = useRef<HTMLDivElement>(null);

  const [hour, minute] = (() => {
    if (!value) return [0, 0];
    const [h, m] = value.split(":").map(Number);
    return [Number.isNaN(h) ? 0 : h, Number.isNaN(m) ? 0 : m];
  })();

  useEffect(() => {
    const _handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        onBlur?.();
      }
    };
    if (open) document.addEventListener("mousedown", _handleClickOutside);
    return () => document.removeEventListener("mousedown", _handleClickOutside);
  }, [open, onBlur]);

  useEffect(() => {
    if (!open) return;
    const scrollTo = (el: HTMLDivElement | null, selector: string) => {
      const target = el?.querySelector<HTMLElement>(selector);
      if (target && el) {
        el.scrollTop = target.offsetTop - el.clientHeight / 2 + target.clientHeight / 2;
      }
    };
    scrollTo(hoursListRef.current, `[data-hour="${hour}"]`);
    scrollTo(minutesListRef.current, `[data-minute="${minute}"]`);
  }, [open, hour, minute]);

  const _emit = (h: number, m: number) => {
    onChange(`${_pad(h)}:${_pad(m)}`);
  };

  const hours = timeFormat === "24-hours"
    ? Array.from({ length: 24 }, (_, i) => i)
    : Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i));
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const period: "AM" | "PM" = hour >= 12 ? "PM" : "AM";

  const _handleHourClick = (h: number) => {
    if (timeFormat === "24-hours") {
      _emit(h, minute);
      return;
    }
    const base = h === 12 ? 0 : h;
    _emit(period === "PM" ? base + 12 : base, minute);
  };

  const _handlePeriodChange = (next: "AM" | "PM") => {
    if (next === period) return;
    const base = hour % 12;
    _emit(next === "PM" ? base + 12 : base, minute);
  };

  const displayHour = timeFormat === "24-hours"
    ? hour
    : (hour % 12 === 0 ? 12 : hour % 12);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 text-sm bg-background border border-input rounded-jotty focus:outline-none focus:border-ring transition-colors text-left",
          !value && "text-muted-foreground",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <span className="truncate">
          {value ? _formatTimeDisplay(value, timeFormat) : placeholder}
        </span>
        <Clock01Icon className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 left-0 bg-popover border border-border rounded-jotty shadow-lg p-2 animate-in fade-in-0 zoom-in-95">
          <div className="flex gap-1">
            <div
              ref={hoursListRef}
              className="h-48 w-14 overflow-y-auto jotty-scrollable-content flex flex-col"
            >
              {hours.map((h) => {
                const selected = displayHour === h;
                return (
                  <button
                    key={h}
                    type="button"
                    data-hour={h}
                    onClick={() => _handleHourClick(h)}
                    className={cn(
                      "py-1 px-2 text-sm rounded-jotty transition-colors text-foreground hover:bg-muted",
                      selected && "bg-primary text-primary-foreground hover:bg-primary",
                    )}
                  >
                    {_pad(h)}
                  </button>
                );
              })}
            </div>
            <div
              ref={minutesListRef}
              className="h-48 w-14 overflow-y-auto jotty-scrollable-content flex flex-col"
            >
              {minutes.map((m) => {
                const selected = minute === m;
                return (
                  <button
                    key={m}
                    type="button"
                    data-minute={m}
                    onClick={() => _emit(hour, m)}
                    className={cn(
                      "py-1 px-2 text-sm rounded-jotty transition-colors text-foreground hover:bg-muted",
                      selected && "bg-primary text-primary-foreground hover:bg-primary",
                    )}
                  >
                    {_pad(m)}
                  </button>
                );
              })}
            </div>
            {timeFormat === "12-hours" && (
              <div className="flex flex-col gap-1 w-12">
                {(["AM", "PM"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => _handlePeriodChange(p)}
                    className={cn(
                      "py-1 px-2 text-sm rounded-jotty transition-colors text-foreground hover:bg-muted",
                      period === p && "bg-primary text-primary-foreground hover:bg-primary",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const TimePicker = memo(TimePickerComponent);

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  className?: string;
  disabled?: boolean;
}

const DateTimePickerComponent = ({
  value,
  onChange,
  onBlur,
  className,
  disabled,
}: DateTimePickerProps) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  const _localParts = (() => {
    if (!value) return null;
    const hasTZ = /T\d{2}:\d{2}/.test(value) && /(Z|[+-]\d{2}:?\d{2})$/.test(value);
    const d = hasTZ ? new Date(value) : null;
    if (d && !isNaN(d.getTime())) {
      return {
        date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      };
    }
    const [dPart, tPart] = value.split("T");
    return { date: dPart || "", time: (tPart || "").slice(0, 5) };
  })();
  const dateVal = _localParts?.date || "";
  const timeVal = _localParts?.time || "";

  function _handleDateChange(newDate: string) {
    if (!newDate) {
      onChange("");
      return;
    }
    const time = timeVal || "00:00";
    onChange(`${newDate}T${time}`);
  }

  function _handleTimeChange(newTime: string) {
    if (!dateVal) return;
    onChange(`${dateVal}T${newTime}`);
  }

  return (
    <div className={cn("flex gap-2", className)}>
      <div className="flex-1">
        <DatePicker
          value={dateVal}
          onChange={_handleDateChange}
          onBlur={onBlur}
          disabled={disabled}
        />
      </div>
      <div className="w-32">
        <TimePicker
          value={timeVal}
          onChange={_handleTimeChange}
          onBlur={onBlur}
          disabled={disabled || !dateVal}
        />
      </div>
    </div>
  );
};

export const DateTimePicker = memo(DateTimePickerComponent);
