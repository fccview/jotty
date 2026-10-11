"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Tag01Icon } from "hugeicons-react";
import { TagInfo } from "@/app/_types";
import { cn } from "@/app/_utils/global-utils";
import { useCompactNumber } from "@/app/_hooks/useCompactNumber";

const SHOWN = 28;

const SIZES = [
  { above: 0.75, className: "text-2xl font-semibold text-primary" },
  { above: 0.5, className: "text-xl font-medium text-foreground" },
  { above: 0.3, className: "text-base text-foreground" },
  { above: 0, className: "text-sm text-muted-foreground" },
];

interface TagCloudProps {
  tags: TagInfo[];
  countOf: (tag: TagInfo) => number;
  onSelect: (tag: TagInfo) => void;
}

export const TagCloud = ({ tags, countOf, onSelect }: TagCloudProps) => {
  const t = useTranslations();
  const compact = useCompactNumber();
  const [showAll, setShowAll] = useState(false);

  const ranked = useMemo(
    () =>
      tags
        .map((tag) => ({ tag, count: countOf(tag) }))
        .filter(({ count }) => count > 0)
        .sort((a, b) => b.count - a.count || a.tag.name.localeCompare(b.tag.name)),
    [tags, countOf],
  );

  if (!ranked.length) return null;

  const top = ranked[0].count;
  const shown = showAll ? ranked : ranked.slice(0, SHOWN);
  const hidden = ranked.length - SHOWN;
  const sizeOf = (count: number) =>
    SIZES.find(({ above }) => count / top > above)?.className;

  return (
    <section className="jotty-tags-tile rounded-jotty border border-border bg-card p-5 min-w-0 [overflow-wrap:anywhere]">
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-jotty bg-primary/10 text-primary shrink-0">
          <Tag01Icon className="h-4 w-4" />
        </span>
        <h2 className="text-base font-semibold text-foreground">{t("notes.tags")}</h2>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {compact(ranked.length)}
        </span>
      </div>
      <div
        className={cn(
          "flex flex-wrap items-baseline gap-x-3 gap-y-1 min-w-0",
          showAll && "max-h-80 overflow-y-auto pr-1",
        )}
      >
        {shown.map(({ tag, count }) => (
          <button
            key={tag.name}
            type="button"
            onClick={() => onSelect(tag)}
            title={t("browse.tagCount", { tag: tag.name, count })}
            className={cn(
              "font-mono hover:text-primary transition-colors truncate max-w-full",
              sizeOf(count),
            )}
          >
            #{tag.name}
          </button>
        ))}
      </div>
      {hidden > 0 && (
        <div className="mt-4 pt-3 border-t border-dashed border-border flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {showAll
              ? t("browse.allTags", { count: compact(ranked.length) })
              : t("browse.topTags", { count: SHOWN })}
          </span>
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="font-medium text-primary hover:underline"
          >
            {showAll ? t("browse.showFewer") : t("browse.more", { count: compact(hidden) })}
          </button>
        </div>
      )}
    </section>
  );
};
