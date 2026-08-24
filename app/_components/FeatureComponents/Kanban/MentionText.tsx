"use client";

import React from "react";
import { cn } from "@/app/_utils/global-utils";

interface MentionTextProps {
  text: string;
  className?: string;
}

export const MentionText: React.FC<MentionTextProps> = ({ text, className }) => {
  const parts = React.useMemo(() => {
    const regex = /(^|\s)@([\w.-]+)/g;
    const result: { type: "text" | "mention"; value: string; prefix?: string }[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const prefix = match[1];
      const username = match[2];
      const matchStart = match.index + prefix.length;

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