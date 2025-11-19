"use client";

import { useMemo } from "react";

interface NoteFooterStatsProps {
  content: string;
}

export const NoteFooterStats = ({ content }: NoteFooterStatsProps) => {
  const stats = useMemo(() => {
    // Remove YAML metadata (frontmatter)
    let contentWithoutMetadata = content.replace(/^---\n[\s\S]*?\n---\n/, "");

    // Extract text from tables before removing them
    // Match markdown tables and extract cell content
    const tableRegex = /\|(.+)\|/g;
    const tableMatches = contentWithoutMetadata.match(tableRegex);
    let tableText = "";

    if (tableMatches) {
      tableMatches.forEach((row) => {
        // Skip separator rows (like | --- | --- |)
        if (!row.match(/^\|[\s-:|]+\|$/)) {
          // Extract text from cells, removing pipes and extra whitespace
          const cells = row
            .split("|")
            .map((cell) => cell.trim())
            .filter((cell) => cell.length > 0);
          tableText += cells.join(" ") + " ";
        }
      });
    }

    // Remove markdown syntax for more accurate word count
    const plainText = contentWithoutMetadata
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, " ")
      // Remove inline code
      .replace(/`[^`]+`/g, " ")
      // Remove images
      .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
      // Remove links but keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, " ")
      // Remove HTML tags
      .replace(/<[^>]+>/g, " ")
      // Remove tables (we already extracted the text)
      .replace(/\|.+\|/g, " ")
      // Remove markdown headers symbols
      .replace(/^#{1,6}\s+/gm, "")
      // Remove bold/italic markers
      .replace(/[*_]{1,3}/g, "")
      // Remove blockquotes
      .replace(/^>\s+/gm, "")
      // Remove horizontal rules
      .replace(/^[-*_]{3,}$/gm, " ")
      // Remove list markers
      .replace(/^[\s]*[-*+]\s+/gm, "")
      .replace(/^[\s]*\d+\.\s+/gm, "")
      // Remove task list markers
      .replace(/^[\s]*-?\s*\[[ xX]\]\s+/gm, "")
      // Remove empty markdown links (like [empty](url))
      .replace(/\[\s*\]\([^)]+\)/g, " ")
      // Add the extracted table text
      + " " + tableText;

    // Calculate character count (excluding whitespace)
    const charCount = plainText.replace(/\s+/g, "").length;

    // Calculate word count
    const words = plainText
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0 && word !== "​"); // Filter out zero-width spaces and empty strings
    const wordCount = words.length;

    // Calculate reading time (average reading speed: 200-250 words per minute)
    // Using 225 as average
    const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 225));

    return {
      wordCount,
      charCount,
      readingTime: readingTimeMinutes,
    };
  }, [content]);

  // Don't render if content is empty
  if (!content.trim()) {
    return null;
  }

  return (
    <div className="mt-8 pt-4 border-t border-border">
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="font-medium">{stats.wordCount.toLocaleString()}</span>
          <span>{stats.wordCount === 1 ? "word" : "words"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium">{stats.charCount.toLocaleString()}</span>
          <span>{stats.charCount === 1 ? "character" : "characters"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium">{stats.readingTime}</span>
          <span>
            {stats.readingTime === 1 ? "minute" : "minutes"} read
          </span>
        </div>
      </div>
    </div>
  );
};
