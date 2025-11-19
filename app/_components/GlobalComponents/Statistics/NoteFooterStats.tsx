"use client";

import { useMemo } from "react";

interface NoteFooterStatsProps {
  content: string;
}

export const NoteFooterStats = ({ content }: NoteFooterStatsProps) => {
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
    <div className="mt-8 pt-4 border-t border-border">
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="font-medium">
            {stats.wordCount.toLocaleString()}
          </span>
          <span>{stats.wordCount === 1 ? "word" : "words"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium">
            {stats.charCount.toLocaleString()}
          </span>
          <span>{stats.charCount === 1 ? "character" : "characters"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium">{stats.readingTime}</span>
          <span>{stats.readingTime === 1 ? "minute" : "minutes"} read</span>
        </div>
      </div>
    </div>
  );
};
