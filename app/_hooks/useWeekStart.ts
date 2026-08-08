"use client";

import { useAppMode } from "@/app/_providers/AppModeProvider";
import { DEFAULT_WEEK_START, WEEK_START_INDEX } from "@/app/_consts/calendar";

export const useWeekStart = (): number => {
  const { user } = useAppMode();
  return WEEK_START_INDEX[user?.firstDayOfWeek || DEFAULT_WEEK_START];
};
