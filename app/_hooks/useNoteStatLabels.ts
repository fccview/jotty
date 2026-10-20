"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { noteStats } from "@/app/_utils/note-stats-utils";

export const useNoteStatLabels = (content: string) => {
  const t = useTranslations();
  const stats = useMemo(() => noteStats(content), [content]);

  return {
    words: t("notes.wordCount", { count: stats.wordCount }),
    chars: t("notes.charCount", { count: stats.charCount }),
    reading: t("notes.readingTime", { count: stats.readingTime }),
  };
};
