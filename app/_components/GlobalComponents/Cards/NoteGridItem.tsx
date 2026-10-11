"use client";

import { File02Icon } from "hugeicons-react";
import { Note } from "@/app/_types";
import { useTranslations } from "next-intl";
import { cn } from "@/app/_utils/global-utils";
import { formatShortTime } from "@/app/_utils/date-utils";
import { categoryLeaf } from "@/app/_utils/category-path-utils";
import { WizardIcon } from "@/app/_components/GlobalComponents/Layout/CustomIcons/WizardIcon";
import { PinToggle } from "./Parts/PinToggle";

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
  return (
    <div
      className="jotty-note-grid-item group relative bg-card border border-border rounded-jotty p-3 hover:border-primary/50 transition-colors h-full flex flex-col"
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-jotty shrink-0",
            note.encrypted ? "bg-primary/[0.15] text-primary" : "bg-muted text-primary",
          )}
        >
          {note.encrypted ? (
            <WizardIcon className="h-5 w-5" />
          ) : (
            <File02Icon className="h-4 w-4" />
          )}
        </span>
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
