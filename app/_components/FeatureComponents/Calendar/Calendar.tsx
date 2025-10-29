'use client';

import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useState, useMemo } from 'react';

interface CalendarDay {
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
    isInRange: boolean;
    isRangeStart: boolean;
    isRangeEnd: boolean;
    isDisabled: boolean;
}

interface CalendarProps {
    selectedDate?: Date;
    selectedRange?: { start: Date; end?: Date };
    onDateSelect?: (date: Date) => void;
    onRangeSelect?: (start: Date, end?: Date) => void;
    mode?: 'single' | 'range';
    minDate?: Date;
    maxDate?: Date;
    className?: string;
}

const DAYS_OF_WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Calendar({
    selectedDate,
    selectedRange,
    onDateSelect,
    onRangeSelect,
    mode = 'single',
    minDate,
    maxDate,
    className = ''
}: CalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [rangeStart, setRangeStart] = useState<Date | undefined>(selectedRange?.start);

    // Generate calendar days for the current month
    const days = useMemo((): CalendarDay[] => {
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get the day of week (0 = Sunday, 1 = Monday, etc.)
        // Adjust so Monday is 0
        let firstDayOfWeek = firstDayOfMonth.getDay() - 1;
        if (firstDayOfWeek === -1) firstDayOfWeek = 6;

        const daysInMonth = lastDayOfMonth.getDate();
        const calendarDays: CalendarDay[] = [];

        // Add days from previous month
        const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const date = new Date(currentYear, currentMonth - 1, prevMonthLastDay - i);
            calendarDays.push(createCalendarDay(date, false));
        }

        // Add days from current month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentYear, currentMonth, day);
            calendarDays.push(createCalendarDay(date, true));
        }

        // Add days from next month to complete the grid (42 cells = 6 weeks)
        const remainingCells = 42 - calendarDays.length;
        for (let day = 1; day <= remainingCells; day++) {
            const date = new Date(currentYear, currentMonth + 1, day);
            calendarDays.push(createCalendarDay(date, false));
        }

        return calendarDays;

        function createCalendarDay(date: Date, isCurrentMonth: boolean): CalendarDay {
            const dateWithoutTime = new Date(date);
            dateWithoutTime.setHours(0, 0, 0, 0);

            const isToday = dateWithoutTime.getTime() === today.getTime();

            let isSelected = false;
            let isInRange = false;
            let isRangeStart = false;
            let isRangeEnd = false;

            if (mode === 'single' && selectedDate) {
                const selectedWithoutTime = new Date(selectedDate);
                selectedWithoutTime.setHours(0, 0, 0, 0);
                isSelected = dateWithoutTime.getTime() === selectedWithoutTime.getTime();
            } else if (mode === 'range' && selectedRange) {
                const startWithoutTime = new Date(selectedRange.start);
                startWithoutTime.setHours(0, 0, 0, 0);

                isRangeStart = dateWithoutTime.getTime() === startWithoutTime.getTime();

                if (selectedRange.end) {
                    const endWithoutTime = new Date(selectedRange.end);
                    endWithoutTime.setHours(0, 0, 0, 0);
                    isRangeEnd = dateWithoutTime.getTime() === endWithoutTime.getTime();
                    isInRange = dateWithoutTime >= startWithoutTime && dateWithoutTime <= endWithoutTime;
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
                isDisabled
            };
        }
    }, [currentMonth, currentYear, selectedDate, selectedRange, mode, minDate, maxDate, rangeStart]);

    const handlePreviousMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const handleDayClick = (day: CalendarDay, event: React.MouseEvent) => {
        // Stop event propagation to prevent parent modals from closing
        event.stopPropagation();

        if (day.isDisabled) return;

        if (mode === 'single') {
            onDateSelect?.(day.date);
        } else if (mode === 'range') {
            if (!rangeStart || (rangeStart && selectedRange?.end)) {
                // Start new range selection
                setRangeStart(day.date);
                onRangeSelect?.(day.date, undefined);
            } else {
                // Complete range selection
                if (day.date >= rangeStart) {
                    onRangeSelect?.(rangeStart, day.date);
                } else {
                    // If clicked date is before start, make it the new start
                    onRangeSelect?.(day.date, rangeStart);
                }
                setRangeStart(undefined);
            }
        }
    };

    return (
        <div className={className}>
            <div className="w-full max-w-md mx-auto">
                <div className="text-center">
                    {/* Month/Year Header with Navigation */}
                    <div className="flex items-center text-gray-900 dark:text-white">
                        <button
                            type="button"
                            onClick={handlePreviousMonth}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="-m-1.5 flex flex-none items-center justify-center p-1.5 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-white transition-colors"
                        >
                            <span className="sr-only">Previous month</span>
                            <ChevronLeft aria-hidden="true" className="size-5" />
                        </button>
                        <div className="flex-auto text-sm font-semibold">
                            {MONTHS[currentMonth]} {currentYear}
                        </div>
                        <button
                            type="button"
                            onClick={handleNextMonth}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="-m-1.5 flex flex-none items-center justify-center p-1.5 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-white transition-colors"
                        >
                            <span className="sr-only">Next month</span>
                            <ChevronRight aria-hidden="true" className="size-5" />
                        </button>
                    </div>

                    {/* Days of Week Header */}
                    <div className="mt-6 grid grid-cols-7 text-xs/6 text-gray-500 dark:text-gray-400">
                        {DAYS_OF_WEEK.map((day, index) => (
                            <div key={index}>{day}</div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="isolate mt-2 grid grid-cols-7 gap-px rounded-lg bg-gray-200 text-sm shadow-sm ring-1 ring-gray-200 dark:bg-white/15 dark:shadow-none dark:ring-white/15">
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
                                    onMouseDown={(e) => e.stopPropagation()}
                                    disabled={day.isDisabled}
                                    className={`
                                        py-1.5 focus:z-10 transition-colors relative
                                        ${!day.isCurrentMonth ? 'bg-gray-50 dark:bg-gray-900/75' : 'bg-white dark:bg-gray-900/90'}
                                        ${!day.isCurrentMonth && !day.isSelected && !day.isToday ? 'text-gray-400 dark:text-gray-500' : ''}
                                        ${day.isCurrentMonth && !day.isSelected && !day.isToday ? 'text-gray-900 dark:text-white' : ''}
                                        ${!day.isDisabled ? 'hover:bg-gray-100 dark:hover:bg-gray-900/50' : 'opacity-40 cursor-not-allowed'}
                                        ${day.isSelected || day.isRangeStart || day.isRangeEnd ? 'font-semibold' : ''}
                                        ${day.isToday && !day.isSelected && !day.isRangeStart && !day.isRangeEnd ? 'font-semibold text-indigo-600 dark:text-indigo-400' : ''}
                                        ${day.isInRange && mode === 'range' ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}
                                        ${isFirstInRow && isFirstRow ? 'rounded-tl-lg' : ''}
                                        ${isLastInRow && isFirstRow ? 'rounded-tr-lg' : ''}
                                        ${isFirstInRow && isLastRow ? 'rounded-bl-lg' : ''}
                                        ${isLastInRow && isLastRow ? 'rounded-br-lg' : ''}
                                    `}
                                >
                                    <time
                                        dateTime={day.date.toISOString()}
                                        className={`
                                            mx-auto flex size-7 items-center justify-center rounded-full
                                            ${(day.isSelected || day.isRangeStart || day.isRangeEnd) && !day.isToday ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : ''}
                                            ${(day.isSelected || day.isRangeStart || day.isRangeEnd) && day.isToday ? 'bg-indigo-600 text-white dark:bg-indigo-500' : ''}
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
