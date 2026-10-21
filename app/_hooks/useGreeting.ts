"use client";

import { useFormatter, useNow, useTranslations } from "next-intl";

const NAME_SEPARATORS = /[._\- ]/;

const partOfDay = (hour: number): string => {
  if (hour < 5) return "stillUp";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
};

export const useGreeting = (username?: string) => {
  const t = useTranslations();
  const format = useFormatter();
  const now = useNow();
  const name = (username || "").split(NAME_SEPARATORS)[0] || username || "";

  return {
    date: format.dateTime(now, { weekday: "long", day: "numeric", month: "long" }),
    greeting: t(`browse.greeting.${partOfDay(now.getHours())}`, { name }),
  };
};
