"use client";

import {
  File02Icon,
  PinIcon,
  PinOffIcon,
  LockKeyIcon,
} from "hugeicons-react";
import { Note } from "@/app/_types";
import { useMemo } from "react";
import { parseNoteContent } from "@/app/_utils/client-parser-utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface NoteGridItemProps {
  note: Note;
  onSelect: (note: Note) => void;
  isPinned?: boolean;
  onTogglePin?: (note: Note) => void;
  sharer?: string;
  isDraggable?: boolean;
}

export const NoteGridItem = ({
  note,
  onSelect,
  isPinned = false,
  onTogglePin,
  sharer,
  isDraggable = false,
}: NoteGridItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: note?.uuid || note.id,
    disabled: !isDraggable,
  });

  const parsedData = useMemo(() => {
    if (!note) {
      return null;
    }

    if ("rawContent" in note) {
      return parseNoteContent((note as any).rawContent, note.id);
    }
    return null;
  }, [note]);

  const displayTitle = parsedData?.title || note?.title;
  const isEncrypted = parsedData?.encrypted ?? note?.encrypted ?? false;

  const categoryName = useMemo(() => {
    return note?.category ? note?.category.split("/").pop() : null;
  }, [note?.category]);

  if (!note) {
    return null;
  }

  const style = isDragging
    ? { opacity: 0.4 }
    : {
      transform: CSS.Transform.toString(transform),
      transition,
    };

  const itemStyle = {
    ...style,
    ...(isDraggable && !isDragging ? { cursor: "grab" } : {}),
  };

  return (
    <div
      ref={setNodeRef}
      style={itemStyle}
      {...(isDraggable ? { ...attributes, ...listeners } : {})}
      className="group relative"
    >
      {onTogglePin && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(note);
          }}
          className={`absolute -top-1 -right-1 z-10 ${isPinned ? "opacity-100" : "opacity-0"
            } group-hover:opacity-100 transition-opacity p-1 bg-background rounded-full border border-border`}
        >
          {isPinned ? (
            <PinOffIcon className="h-3 w-3 text-muted-foreground" />
          ) : (
            <PinIcon className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
      )}

      <div
        className="flex flex-col items-center cursor-pointer p-2.5"
        onClick={() => onSelect(note)}
      >
        <div className="relative mb-2">
          <File02Icon className="h-16 w-16 text-primary !stroke-1" />
          {isEncrypted && (
            <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center">
              <LockKeyIcon className="h-4 w-4" />
            </div>
          )}
        </div>

        <h3 className="font-medium text-md lg:text-sm text-center text-foreground line-clamp-2 w-full px-1">
          {displayTitle}
        </h3>

        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
          {sharer && <span className="truncate">{sharer}</span>}
          {!sharer && categoryName && <span className="truncate">{categoryName}</span>}
        </div>
      </div>
    </div>
  );
};
