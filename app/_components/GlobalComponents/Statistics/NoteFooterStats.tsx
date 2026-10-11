"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

const STATS_SEPARATOR = "·";

interface NoteFooterStatsProps {
  content: string;
}

export const NoteFooterStats = ({ content }: NoteFooterStatsProps) => {
  const t = useTranslations();
  const stats = useMemo(() => {
    let contentWithoutMetadata = content.replace(/^---\n[\s\S]*?\n---\n/, "");

    const tableRegex = /\|(.+)\|/g;
    const tableMatches = contentWithoutMetadata.match(tableRegex);
    let tableText = "";

    if (tableMatches) {
      tableMatches.forEach((row) => {
        if (!row.match(/^\|[\s-:|]+\|$/)) {
          const cells = row
            .split("|")
            .map((cell) => cell.trim())
            .filter((cell) => cell.length > 0);
          tableText += cells.join(" ") + " ";
        }
      });
    }

    const plainText =
      contentWithoutMetadata
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/`[^`]+`/g, " ")
        .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/<!--[\s\S]*?-->/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\|.+\|/g, " ")
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/[*_]{1,3}/g, "")
        .replace(/^>\s+/gm, "")
        .replace(/^[-*_]{3,}$/gm, " ")
        .replace(/^[\s]*[-*+]\s+/gm, "")
        .replace(/^[\s]*\d+\.\s+/gm, "")
        .replace(/^[\s]*-?\s*\[[ xX]\]\s+/gm, "")
        .replace(/\[\s*\]\([^)]+\)/g, " ") +
      " " +
      tableText;

    const charCount = plainText.replace(/\s+/g, "").length;

    const words = plainText
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0 && word !== "​");
    const wordCount = words.length;

    const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 225));

    return {
      wordCount,
      charCount,
      readingTime: readingTimeMinutes,
    };
  }, [content]);

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
