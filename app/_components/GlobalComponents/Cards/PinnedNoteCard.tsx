"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Note } from "@/app/_types";
import { Modes } from "@/app/_types/enums";
import { formatShortTime } from "@/app/_utils/date-utils";
import { noteDisplayOf } from "@/app/_utils/note-display-utils";
import { categoryLeaf } from "@/app/_utils/category-path-utils";
import { PinToggle } from "./Parts/PinToggle";
import { SealedPanel, SealedSize } from "./Parts/SealedPanel";
import { ItemShareMark } from "./Parts/ItemShareMark";
import { useCardClick } from "@/app/_hooks/useCardClick";

interface PinnedNoteCardProps {
  note: Note;
  position: number;
  onSelect: (note: Note) => void;
  onTogglePin?: (note: Note) => void;
}

export const PinnedNoteCard = ({ note, position, onSelect, onTogglePin }: PinnedNoteCardProps) => {
  const t = useTranslations();
  const { title, isEncrypted, stats } = useMemo(() => noteDisplayOf(note), [note]);
  const handleClick = useCardClick(note, onSelect);

  return (
    <article
      onClick={handleClick}
      className="jotty-note-card group cursor-pointer bg-card border border-border rounded-jotty p-3.5 pt-4 transition-colors hover:border-primary/50 [overflow-wrap:anywhere]">
      <div className="flex items-start gap-2">
        <span className="font-mono text-[11px] font-semibold text-primary mt-0.5">
          {String(position).padStart(2, "0")}
        </span>
        <button
          type="button"
          onClick={() => onSelect(note)}
          className="flex-1 min-w-0 text-left font-semibold text-sm leading-snug text-foreground group-hover:text-primary line-clamp-3"
          title={title}
        >
          {title}
        </button>
        {onTogglePin && (
          <PinToggle isPinned onToggle={() => onTogglePin(note)} className="p-1 -mr-1.5 -mt-1" />
        )}
      </div>
      {isEncrypted ? (
        <div className="mt-2">
          <SealedPanel size={SealedSize.XS} />
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-3">
          {stats.excerpt}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between gap-2 font-mono text-[11px] text-muted-foreground">
        <span className="truncate">{categoryLeaf(note.category, t("notes.uncategorized"))}</span>
        <span className="flex items-center gap-1.5 shrink-0">
          <ItemShareMark item={note} mode={Modes.NOTES} />
          {formatShortTime(note.updatedAt, t)}
        </span>
      </div>
    </article>
  );
};
