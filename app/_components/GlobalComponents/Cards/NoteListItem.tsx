"use client";

import { Note } from "@/app/_types";
import { ItemTypes, Modes } from "@/app/_types/enums";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/app/_utils/global-utils";
import { formatShortTime } from "@/app/_utils/date-utils";
import { isNoteEncrypted, noteExcerptOf } from "@/app/_utils/note-display-utils";
import { categoryTrail } from "@/app/_utils/category-path-utils";
import { PinToggle } from "./Parts/PinToggle";
import { ItemShareMark } from "./Parts/ItemShareMark";
import { ItemGlyph } from "./Parts/ItemGlyph";
import { useCardClick } from "@/app/_hooks/useCardClick";

interface NoteListItemProps {
  note: Note;
  onSelect: (note: Note) => void;
  isPinned?: boolean;
  onTogglePin?: (note: Note) => void;
  isSelected?: boolean;
  showExcerpt?: boolean;
  isBare?: boolean;
}

export const NoteListItem = ({
  note,
  onSelect,
  isPinned = false,
  onTogglePin,
  isSelected = false,
  showExcerpt = false,
  isBare = false,
}: NoteListItemProps) => {
  const t = useTranslations();
  const isEncrypted = isNoteEncrypted(note);
  const handleClick = useCardClick(note, onSelect);
  const excerpt = useMemo(() => (showExcerpt ? noteExcerptOf(note) : ""), [showExcerpt, note]);

  return (
    <div
      onClick={handleClick}
      className={cn(
        "jotty-note-list-item group cursor-pointer flex items-start gap-3 px-4 py-3 transition-colors",
        !isBare && "bg-card border border-border rounded-jotty",
        isSelected ? "bg-primary/10" : "hover:bg-muted/40",
      )}
    >
      <ItemGlyph type={ItemTypes.NOTE} isEncrypted={isEncrypted} className="mt-0.5" />

      <button
        type="button"
        onClick={() => onSelect(note)}
        className="flex-1 min-w-0 text-left"
      >
        <span
          className={cn(
            "block font-medium text-md lg:text-sm truncate",
            isSelected ? "text-primary" : "text-foreground group-hover:text-primary",
          )}
        >
          {note.title}
        </span>
        <span className="block font-mono text-[11px] text-muted-foreground mt-0.5 truncate">
          {categoryTrail(note.category, t("notes.uncategorized"))}
        </span>
        {showExcerpt &&
          (isEncrypted ? (
            <span className="block text-xs text-muted-foreground mt-1">
              {t("encryption.thisNoteIsEncrypted")}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {excerpt}
            </span>
          ))}
      </button>

      <span className="flex flex-col items-end gap-1 shrink-0">
        <span className="font-mono text-[11px] text-muted-foreground">
          {formatShortTime(note.updatedAt, t)}
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <ItemShareMark item={note} mode={Modes.NOTES} />
          {onTogglePin && (
            <PinToggle
              isPinned={isPinned}
              onToggle={() => onTogglePin(note)}
              className="p-1"
            />
          )}
        </span>
      </span>
    </div>
  );
};
