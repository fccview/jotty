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

interface NoteListItemProps {
  note: Note;
  onSelect: (note: Note) => void;
  isPinned?: boolean;
  onTogglePin?: (note: Note) => void;
  sharer?: string;
  isDraggable?: boolean;
}

export const NoteListItem = ({
  note,
  onSelect,
  isPinned = false,
  onTogglePin,
  sharer,
  isDraggable = false,
}: NoteListItemProps) => {
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
      className="bg-card border border-border rounded-jotty group hover:border-primary transition-colors"
    >
      <div className="p-3 flex items-center gap-3">
        <div className="flex-shrink-0">
          <File02Icon className="h-5 w-5 text-primary" />
        </div>

        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onSelect(note)}
        >
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-md lg:text-sm text-foreground truncate">
              {displayTitle}
            </h3>
            {isEncrypted && (
              <LockKeyIcon className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            )}
          </div>
          {categoryName && (
            <div className="text-md lg:text-xs text-muted-foreground mt-1 truncate">
              {categoryName}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {onTogglePin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(note);
              }}
              className={`${isPinned ? "opacity-100" : "opacity-0"
                } group-hover:opacity-100 transition-opacity p-1.5 rounded-jotty flex-shrink-0`}
            >
              {isPinned ? (
                <PinOffIcon className="h-4 w-4 text-muted-foreground" />
              ) : (
                <PinIcon className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
