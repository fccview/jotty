"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { formatTime } from "@/app/_utils/checklist-utils";
import { useCompactNumber } from "@/app/_hooks/useCompactNumber";

const SECONDS_PER_HOUR = 3600;
const COMPACT_HOURS_FROM = 1000;

export const useTrackedTime = () => {
  const t = useTranslations();
  const compact = useCompactNumber();

  return useCallback(
    (seconds: number) => {
      const hours = Math.floor(seconds / SECONDS_PER_HOUR);
      return hours >= COMPACT_HOURS_FROM
        ? t("browse.hours", { count: compact(hours) })
        : formatTime(seconds);
    },
    [t, compact],
  );
};
