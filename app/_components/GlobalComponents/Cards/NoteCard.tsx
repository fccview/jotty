"use client";

import { TextNumberSignIcon } from "hugeicons-react";
import { Note } from "@/app/_types";
import { Modes } from "@/app/_types/enums";
import { formatShortTime } from "@/app/_utils/date-utils";
import { useMemo } from "react";
import { useSettings } from "@/app/_utils/settings-store";
import { UnifiedMarkdownRenderer } from "../../FeatureComponents/Notes/Parts/UnifiedMarkdownRenderer";
import { noteDisplayOf } from "@/app/_utils/note-display-utils";
import { categoryTrail } from "@/app/_utils/category-path-utils";
import { cn } from "@/app/_utils/global-utils";
import { useTranslations } from "next-intl";
import { useCompactNumber } from "@/app/_hooks/useCompactNumber";
import { PinToggle } from "./Parts/PinToggle";
import { SealedPanel } from "./Parts/SealedPanel";
import { ItemShareMark } from "./Parts/ItemShareMark";

const CARD_TAG_LIMIT = 2;

interface NoteCardProps {
  note: Note;
  onSelect: (note: Note) => void;
  isPinned?: boolean;
  onTogglePin?: (note: Note) => void;
  fullScrollableContent?: boolean;
}

export const NoteCard = ({
  note,
  onSelect,
  isPinned = false,
  onTogglePin,
  fullScrollableContent = false,
}: NoteCardProps) => {
  const t = useTranslations();
  const compact = useCompactNumber();
  const { showMarkdownPreview } = useSettings();
  const { title, content, isEncrypted, stats } = useMemo(() => noteDisplayOf(note), [note]);

  return (
    <article
      className={cn(
        "jotty-note-card group bg-card border border-border rounded-jotty overflow-hidden transition-colors duration-200 hover:border-primary/50 flex flex-col [overflow-wrap:anywhere]",
      )}
    >
      <div className="h-1 bg-primary/70" />
      <div className="flex items-center justify-between gap-2 pl-4 pr-2 h-9 border-b border-dashed border-border">
        <span className="font-mono text-[11px] text-muted-foreground truncate">
          {categoryTrail(note.category, t("notes.uncategorized"))}
        </span>
        <span className="flex items-center gap-0.5 shrink-0">
          {onTogglePin && (
            <PinToggle
              isPinned={isPinned}
              onToggle={() => onTogglePin(note)}
              className="p-1"
            />
          )}
          <span className="font-mono text-[11px] text-muted-foreground pr-2">
            {formatShortTime(note.updatedAt, t)}
          </span>
        </span>
      </div>

      <button
        type="button"
        onClick={() => onSelect(note)}
        className="jotty-note-card-title block w-full text-left px-4 pt-3 pb-3"
      >
        <h3 className="font-semibold text-lg leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-3">
          {title}
        </h3>
        {isEncrypted ? (
          <div className="mt-3">
            <SealedPanel />
          </div>
        ) : showMarkdownPreview || fullScrollableContent ? (
          <div
            className={cn(
              "jotty-note-card-content mt-2 text-md lg:text-sm text-muted-foreground prose prose-sm max-w-none [&>*]:!my-1 [&>h1]:!text-sm [&>h2]:!text-sm [&>h3]:!text-sm [&>p]:!text-sm [&>pre]:!text-xs [&>img]:!max-h-32",
              fullScrollableContent ? "max-h-[200px] overflow-y-auto" : "line-clamp-5",
            )}
          >
            <UnifiedMarkdownRenderer content={content} />
          </div>
        ) : (
          <p className="jotty-note-card-content mt-2 text-md lg:text-sm text-muted-foreground leading-relaxed line-clamp-5">
            {stats.excerpt}
          </p>
        )}
      </button>

      <div className="jotty-note-card-footer px-4 pb-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-2 min-w-0">
          {!isEncrypted &&
            (note.tags || []).slice(0, CARD_TAG_LIMIT).map((tag) => (
              <span key={tag} className="font-mono text-primary truncate">
                #{tag}
              </span>
            ))}
        </span>
        <span className="flex items-center gap-2 shrink-0">
          <ItemShareMark item={note} mode={Modes.NOTES} />
          {isEncrypted ? (
            <span>{t("encryption.encrypted")}</span>
          ) : (
            <span
              className="inline-flex items-center gap-1"
              title={t("notes.wordCount", { count: stats.wordCount })}
            >
              <TextNumberSignIcon className="h-3 w-3" />
              {compact(stats.wordCount)}
            </span>
          )}
        </span>
      </div>
    </article>
  );
};
