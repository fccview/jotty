"use client";

import { Note } from "@/app/_types";
import { useTranslations } from "next-intl";
import { formatShortTime } from "@/app/_utils/date-utils";
import { categoryLeaf } from "@/app/_utils/category-path-utils";
import { ItemTypes } from "@/app/_types/enums";
import { isNoteEncrypted } from "@/app/_utils/note-display-utils";
import { PinToggle } from "./Parts/PinToggle";
import { ItemGlyph } from "./Parts/ItemGlyph";
import { useCardClick } from "@/app/_hooks/useCardClick";

interface NoteGridItemProps {
  note: Note;
  onSelect: (note: Note) => void;
  isPinned?: boolean;
  onTogglePin?: (note: Note) => void;
}

export const NoteGridItem = ({
  note,
  onSelect,
  isPinned = false,
  onTogglePin,
}: NoteGridItemProps) => {
  const t = useTranslations();
  const handleClick = useCardClick(note, onSelect);

  return (
    <div
      onClick={handleClick}
      className="jotty-note-grid-item group relative cursor-pointer bg-card border border-border rounded-jotty p-3 hover:border-primary/50 transition-colors h-full flex flex-col"
    >
      <div className="flex items-start justify-between gap-1">
        <ItemGlyph type={ItemTypes.NOTE} isEncrypted={isNoteEncrypted(note)} />
        {onTogglePin && (
          <PinToggle
            isPinned={isPinned}
            onToggle={() => onTogglePin(note)}
            className="p-1 -mr-1 -mt-1"
          />
        )}
      </div>
      <button
        type="button"
        onClick={() => onSelect(note)}
        className="mt-3 text-left font-medium text-md lg:text-sm leading-snug text-foreground group-hover:text-primary line-clamp-2"
      >
        {note.title}
      </button>
      <div className="mt-auto pt-2 flex items-center justify-between gap-2 font-mono text-[11px] text-muted-foreground">
        <span className="truncate">
          {categoryLeaf(note.category, t("notes.uncategorized"))}
        </span>
        <span>{formatShortTime(note.updatedAt, t)}</span>
      </div>
    </div>
  );
};
