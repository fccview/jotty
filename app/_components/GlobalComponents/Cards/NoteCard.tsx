"use client";

import { TextNumberSignIcon } from "hugeicons-react";
import { Note } from "@/app/_types";
import { Modes } from "@/app/_types/enums";
import { formatShortTime } from "@/app/_utils/date-utils";
import { useMemo } from "react";
import { useQuickValue } from "@/app/_hooks/settings/useQuickSetting";
import { QuickSettingId } from "@/app/_consts/quick-settings";
import { UnifiedMarkdownRenderer } from "../../FeatureComponents/Notes/Parts/UnifiedMarkdownRenderer";
import { noteDisplayOf } from "@/app/_utils/note-display-utils";
import { categoryTrail } from "@/app/_utils/category-path-utils";
import { cn } from "@/app/_utils/global-utils";
import { useTranslations } from "next-intl";
import { useCompactNumber } from "@/app/_hooks/useCompactNumber";
import { PinToggle } from "./Parts/PinToggle";
import { SealedPanel } from "./Parts/SealedPanel";
import { ItemShareMark } from "./Parts/ItemShareMark";
import { useCardClick } from "@/app/_hooks/useCardClick";

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
  const showMarkdownPreview = useQuickValue(QuickSettingId.CARD_PREVIEW);
  const { title, content, isEncrypted, hasBody, stats } = useMemo(() => noteDisplayOf(note), [note]);
  const isRich = hasBody && (showMarkdownPreview || fullScrollableContent);
  const handleClick = useCardClick(note, onSelect);

  return (
    <article
      onClick={handleClick}
      className="jotty-note-card group cursor-pointer bg-card border border-border rounded-jotty overflow-hidden transition-colors duration-200 hover:border-primary/50 flex flex-col [overflow-wrap:anywhere]"
    >
      <div className="flex items-center justify-between gap-2 pl-4 pr-2 pt-3 min-h-7">
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
        className={cn(
          "jotty-note-card-title block w-full text-left px-4 pt-0.5",
          isRich && !isEncrypted ? "pb-0" : "pb-3",
        )}
      >
        <h3 className="font-semibold text-base leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-3">
          {title}
        </h3>
        {isEncrypted ? (
          <div className="mt-3">
            <SealedPanel />
          </div>
        ) : (
          !isRich && (
            <p className="jotty-note-card-content mt-2 text-md lg:text-sm text-muted-foreground leading-relaxed line-clamp-3">
              {stats.excerpt}
            </p>
          )
        )}
      </button>
      {isRich && !isEncrypted && (
        <div className="jotty-note-card-content mx-4 mt-2 mb-3 max-h-[200px] overflow-y-auto overscroll-contain text-md lg:text-sm text-muted-foreground prose prose-sm max-w-none [&>*]:!my-1 [&>h1]:!text-sm [&>h2]:!text-sm [&>h3]:!text-sm [&>p]:!text-sm [&>pre]:!text-xs [&>img]:!max-h-32">
          <UnifiedMarkdownRenderer content={content} />
        </div>
      )}

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
              className="inline-flex items-center gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
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
