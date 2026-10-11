"use client";

import { File02Icon } from "hugeicons-react";
import { Note } from "@/app/_types";
import { Modes } from "@/app/_types/enums";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/app/_utils/global-utils";
import { formatShortTime } from "@/app/_utils/date-utils";
import { noteStats } from "@/app/_utils/note-stats-utils";
import { categoryTrail } from "@/app/_utils/category-path-utils";
import { WizardIcon } from "@/app/_components/GlobalComponents/Layout/CustomIcons/WizardIcon";
import { PinToggle } from "./Parts/PinToggle";
import { ItemShareMark } from "./Parts/ItemShareMark";

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
  const excerpt = useMemo(
    () => (showExcerpt && !note.encrypted ? noteStats(note.content || "").excerpt : ""),
    [showExcerpt, note.encrypted, note.content],
  );

  return (
    <div
      className={cn(
        "jotty-note-list-item group flex items-start gap-3 px-4 py-3 transition-colors",
        !isBare && "bg-card border border-border rounded-jotty",
        isSelected ? "bg-primary/10" : "hover:bg-muted/40",
      )}
    >
      <span
        className={cn(
          "mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-jotty shrink-0",
          note.encrypted ? "bg-primary/[0.15] text-primary" : "bg-muted text-primary",
        )}
      >
        {note.encrypted ? (
          <WizardIcon className="h-5 w-5" />
        ) : (
          <File02Icon className="h-4 w-4" />
        )}
      </span>

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
          (note.encrypted ? (
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
