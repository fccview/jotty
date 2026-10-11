"use client";

import { Note } from "@/app/_types";
import { ViewMode } from "@/app/_consts/view-modes";
import { ItemViews } from "./ItemViews";
import { NoteCard } from "./NoteCard";
import { NoteListItem } from "./NoteListItem";
import { NoteGridItem } from "./NoteGridItem";

interface NoteItemsProps {
  notes: Note[];
  view: ViewMode;
  columns: Record<string, number>;
  gap?: "tight" | "loose";
  onSelect: (note: Note) => void;
  isPinned: (note: Note) => boolean;
  onTogglePin: (note: Note) => void;
}

export const NoteItems = ({
  notes,
  view,
  columns,
  gap,
  onSelect,
  isPinned,
  onTogglePin,
}: NoteItemsProps) => {
  const pinProps = (note: Note) => ({
    note,
    onSelect,
    isPinned: isPinned(note),
    onTogglePin: note.lockReason ? undefined : onTogglePin,
  });

  return (
    <ItemViews
      items={notes}
      view={view}
      keyOf={(note) => note.uuid}
      columns={columns}
      gap={gap}
      renderCard={(note) => <NoteCard {...pinProps(note)} />}
      renderRow={(note) => <NoteListItem {...pinProps(note)} />}
      renderTile={(note) => <NoteGridItem {...pinProps(note)} />}
    />
  );
};
