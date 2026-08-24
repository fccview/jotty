"use client";

import React from "react";
import { cn } from "@/app/_utils/global-utils";

interface MentionTextProps {
  text: string;
  className?: string;
}

/**
 * Renders text with @mentions highlighted as styled spans.
 * Mentions are identified by @username where username consists of
 * word characters, dots, or hyphens, preceded by start-of-string or whitespace.
 */
export const MentionText: React.FC<MentionTextProps> = ({ text, className }) => {
  const parts = React.useMemo(() => {
    // Split on @mentions while keeping the delimiters
    // A mention is @ followed by word chars, dots, or hyphens,
    // and must be at start of string or preceded by whitespace.
    const regex = /(^|\s)@([\w.-]+)/g;
    const result: { type: "text" | "mention"; value: string; prefix?: string }[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const prefix = match[1]; // the leading whitespace or empty string
      const username = match[2];
      const matchStart = match.index + prefix.length;

      // Text before this mention
      if (matchStart > lastIndex) {
        result.push({ type: "text", value: text.substring(lastIndex, matchStart) });
      }

      result.push({
        type: "mention",
        value: username,
        prefix: prefix || undefined,
      });

      lastIndex = match.index + match[0].length;
    }

    // Remaining text after the last mention
    if (lastIndex < text.length) {
      result.push({ type: "text", value: text.substring(lastIndex) });
    }

    return result.length > 0 ? result : [{ type: "text" as const, value: text }];
  }, [text]);

  return (
    <>
      {parts.map((part, i) =>
        part.type === "mention" ? (
          <span
            key={i}
            className={cn(
              "font-medium text-primary bg-primary/10 rounded px-1 py-0.5",
              className,
            )}
          >
            {part.prefix}
            @{part.value}
          </span>
        ) : (
          <React.Fragment key={i}>{part.value}</React.Fragment>
        ),
      )}
    </>
  );
};

MentionText.displayName = "MentionText";