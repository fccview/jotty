"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { noteStats } from "@/app/_utils/note-stats-utils";

const STATS_SEPARATOR = "·";

interface NoteFooterStatsProps {
  content: string;
}

export const NoteFooterStats = ({ content }: NoteFooterStatsProps) => {
  const t = useTranslations();
  const stats = useMemo(() => noteStats(content), [content]);

  if (!content.trim()) {
    return null;
  }

  return (
    <div className="jotty-note-stats mt-12 pt-4 border-t border-border no-print">
      <span>{t("notes.wordCount", { count: stats.wordCount })}</span>
      <span className="jotty-note-stats-sep" aria-hidden="true">
        {STATS_SEPARATOR}
      </span>
      <span>{t("notes.charCount", { count: stats.charCount })}</span>
      <span className="jotty-note-stats-sep" aria-hidden="true">
        {STATS_SEPARATOR}
      </span>
      <span>{t("notes.readingTime", { count: stats.readingTime })}</span>
    </div>
  );
};
