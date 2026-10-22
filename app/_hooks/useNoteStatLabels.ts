"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { noteStats, readingTimeOf } from "@/app/_utils/note-stats-utils";

export const useNoteStatLabels = (content: string, summaryWords?: number) => {
  const t = useTranslations();
  const stats = useMemo(() => noteStats(content), [content]);
  const wordCount = summaryWords ?? stats.wordCount;

  return {
    words: t("notes.wordCount", { count: wordCount }),
    chars: t("notes.charCount", { count: stats.charCount }),
    reading: t("notes.readingTime", { count: readingTimeOf(wordCount) }),
  };
};
