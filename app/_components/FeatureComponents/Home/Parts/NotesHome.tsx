"use client";

import {
  Add01Icon,
  File02Icon,
  Folder02Icon,
  PinIcon,
  Clock01Icon,
  ArrowRight04Icon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Note, Category, User } from "@/app/_types";
import { EmptyState } from "@/app/_components/GlobalComponents/Cards/EmptyState";
import { NoteCard } from "@/app/_components/GlobalComponents/Cards/NoteCard";
import Masonry from "react-masonry-css";
import { DndContext, DragOverlay, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useNotesHome } from "@/app/_hooks/useNotesHome";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { encodeCategoryPath } from "@/app/_utils/global-utils";

interface NotesHomeProps {
  notes: Note[];
  categories: Category[];
  user: User | null;
  onCreateModal: () => void;
  onSelectNote: (note: Note) => void;
}

export const NotesHome = ({
  notes,
  categories,
  user,
  onCreateModal,
  onSelectNote,
}: NotesHomeProps) => {
  const { userSharedItems } = useAppMode();

  const {
    sensors,
    handleDragStart,
    handleDragEnd,
    pinned,
    recent,
    stats,
    breakpointColumnsObj,
    handleTogglePin,
    isNotePinned,
    activeNote,
    draggedItemWidth,
  } = useNotesHome({ notes, categories, user });

  const getNoteSharer = (note: Note) => {
    const encodedCategory = encodeCategoryPath(
      note.category || "Uncategorized"
    );
    const sharedItem = userSharedItems?.notes?.find(
      (item) => item.id === note.id && item.category === encodedCategory
    );
    return sharedItem?.sharer;
  };

  if (notes.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto bg-background h-full">
        <EmptyState
          icon={<File02Icon className="h-10 w-10 text-muted-foreground" />}
          title="No notes yet"
          description="Create your first note to get started with your knowledge base."
          buttonText="Create New Note"
          onButtonClick={() => onCreateModal()}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background h-full hide-scrollbar">
      <div className="max-w-full pt-6 pb-4 px-4 lg:pt-8 lg:pb-8 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 lg:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-foreground tracking-tight">
              Notes
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
              Your knowledge workspace
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/notes")}
              size="sm"
              className="flex-1 sm:size-lg"
            >
              <span className="hidden sm:inline">All Notes</span>
              <span className="sm:hidden">All</span>
            </Button>
            <Button
              onClick={() => onCreateModal()}
              size="sm"
              className="flex-1 sm:size-lg"
            >
              <Add01Icon className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">New Note</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>

        {pinned.length > 0 && (
          <div className="mb-8 lg:mb-12 overflow-hidden">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="p-2 bg-primary/10 rounded-lg">
                <PinIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                Pinned Notes
              </h2>
              <div className="flex-1 h-px bg-border"></div>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={pinned.map((note) => note.uuid || note.id)}
                strategy={verticalListSortingStrategy}
              >
                <Masonry
                  breakpointCols={breakpointColumnsObj}
                  className="flex w-auto -ml-6"
                  columnClassName="pl-6 bg-clip-padding"
                >
                  {pinned.map((note) => (
                    <div
                      key={`pinned-${note.category}-${note.uuid || note.id}`}
                      className="mb-6"
                    >
                      <NoteCard
                        note={note}
                        onSelect={onSelectNote}
                        isPinned={true}
                        onTogglePin={handleTogglePin}
                        isDraggable={true}
                        sharer={getNoteSharer(note)}
                      />
                    </div>
                  ))}
                </Masonry>
              </SortableContext>

              <DragOverlay>
                {activeNote ? (
                  <NoteCard
                    note={activeNote}
                    onSelect={() => {}}
                    isPinned={true}
                    isDraggable={false}
                    sharer={getNoteSharer(activeNote)}
                    fixedWidth={draggedItemWidth || undefined}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}

        {recent.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock01Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                Recent Notes
              </h2>
              <div className="flex-1 h-px bg-border"></div>
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/notes")}
                size="sm"
                className="ml-2"
              >
                <span className="hidden sm:inline">Show All</span>
                <span className="sm:hidden">All</span>
                <ArrowRight04Icon className="h-4 w-4 ml-1 sm:ml-2" />
              </Button>
            </div>
            <Masonry
              breakpointCols={breakpointColumnsObj}
              className="flex w-auto -ml-6"
              columnClassName="pl-6 bg-clip-padding"
            >
              {recent.map((note) => (
                <div
                  key={`recent-${note.category}-${note.id}`}
                  className="mb-6"
                >
                  <NoteCard
                    note={note}
                    onSelect={onSelectNote}
                    isPinned={isNotePinned(note)}
                    onTogglePin={handleTogglePin}
                    sharer={getNoteSharer(note)}
                  />
                </div>
              ))}
            </Masonry>
          </div>
        )}

        {notes.length > 12 && (
          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              Showing {recent.length} of {notes.length} notes. Use the sidebar
              to browse all or search above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
