"use client";

import { Add01Icon, File02Icon, ArrowRight04Icon, Cancel01Icon } from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Note, Category, SanitisedUser } from "@/app/_types";
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
import { useTranslations } from "next-intl";
import { useSettings } from "@/app/_utils/settings-store";
import { NoteListItem } from "@/app/_components/GlobalComponents/Cards/NoteListItem";
import { NoteGridItem } from "@/app/_components/GlobalComponents/Cards/NoteGridItem";
import { useMemo } from "react";

interface NotesHomeProps {
  notes: Note[];
  categories: Category[];
  user: SanitisedUser | null;
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
  const t = useTranslations();
  const { userSharedItems, selectedFilter, setSelectedFilter, tagsIndex } = useAppMode();
  const { viewMode } = useSettings();

  const {
    sensors,
    handleDragStart,
    handleDragEnd,
    pinned,
    recent,
    breakpointColumnsObj,
    handleTogglePin,
    isNotePinned,
    activeNote,
    draggedItemWidth,
  } = useNotesHome({ notes, categories, user });

  const filteredRecent = useMemo(() => {
    if (!selectedFilter) return recent;

    if (selectedFilter.type === 'category') {
      return notes.filter((note) => {
        const noteCategory = note.category || "Uncategorized";
        return noteCategory === selectedFilter.value || noteCategory.startsWith(selectedFilter.value + "/");
      });
    }

    if (selectedFilter.type === 'tag') {
      const tagInfo = tagsIndex[selectedFilter.value];
      if (!tagInfo) return [];
      return notes.filter((note) => tagInfo.noteUuids.includes(note.uuid || ''));
    }

    return recent;
  }, [notes, recent, selectedFilter, tagsIndex]);

  const filterDisplayName = useMemo(() => {
    if (!selectedFilter) return null;
    if (selectedFilter.type === 'category') {
      return selectedFilter.value.split("/").pop() || selectedFilter.value;
    }
    return tagsIndex[selectedFilter.value]?.displayName || selectedFilter.value;
  }, [selectedFilter, tagsIndex]);

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
      <div className="flex-1 overflow-y-auto jotty-scrollable-content bg-background h-full">
        <EmptyState
          icon={<File02Icon className="h-10 w-10 text-muted-foreground" />}
          title={t("notes.noNotesYet")}
          description={t("notes.createFirstNote")}
          buttonText={t("notes.createNewNote")}
          onButtonClick={() => onCreateModal()}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto jotty-scrollable-content bg-background h-full hide-scrollbar">
      <div className="max-w-full pt-6 pb-4 px-4 lg:pt-8 lg:pb-8 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 lg:mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-foreground tracking-tight">
              {selectedFilter ? filterDisplayName : t("notes.title")}
            </h1>
            {selectedFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFilter(null)}
                className="mt-1"
              >
                <Cancel01Icon className="h-3 w-3" />
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/notes")}
              size="sm"
              className="flex-1 sm:size-lg h-14 lg:h-9"
            >
              <span className="hidden sm:inline">{t("notes.allNotes")}</span>
              <span className="sm:hidden">All</span>
            </Button>
            <Button
              onClick={() => onCreateModal()}
              size="sm"
              className="flex-1 sm:size-lg h-14 lg:h-9"
            >
              <Add01Icon className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{t("notes.newNote")}</span>
              <span className="sm:hidden">{t("common.new")}</span>
            </Button>
          </div>
        </div>

        {pinned.length > 0 && (
          <div className="mb-8 lg:mb-12 overflow-hidden">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                {t("common.pinned")}
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
                {viewMode === "card" && (
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
                )}

                {viewMode === "list" && (
                  <div className="space-y-3">
                    {pinned.map((note) => (
                      <NoteListItem
                        key={`pinned-${note.category}-${note.uuid || note.id}`}
                        note={note}
                        onSelect={onSelectNote}
                        isPinned={true}
                        onTogglePin={handleTogglePin}
                        sharer={getNoteSharer(note)}
                        isDraggable={true}
                      />
                    ))}
                  </div>
                )}

                {viewMode === "grid" && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {pinned.map((note) => (
                      <NoteGridItem
                        key={`pinned-${note.category}-${note.uuid || note.id}`}
                        note={note}
                        onSelect={onSelectNote}
                        isPinned={true}
                        onTogglePin={handleTogglePin}
                        sharer={getNoteSharer(note)}
                        isDraggable={true}
                      />
                    ))}
                  </div>
                )}
              </SortableContext>

              <DragOverlay>
                {activeNote ? (
                  <>
                    {viewMode === "card" && (
                      <NoteCard
                        note={activeNote}
                        onSelect={() => { }}
                        isPinned={true}
                        isDraggable={false}
                        sharer={getNoteSharer(activeNote)}
                        fixedWidth={draggedItemWidth || undefined}
                      />
                    )}
                    {viewMode === "list" && (
                      <NoteListItem
                        note={activeNote}
                        onSelect={() => { }}
                        isPinned={true}
                        sharer={getNoteSharer(activeNote)}
                      />
                    )}
                    {viewMode === "grid" && (
                      <NoteGridItem
                        note={activeNote}
                        onSelect={() => { }}
                        isPinned={true}
                        sharer={getNoteSharer(activeNote)}
                      />
                    )}
                  </>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}

        {filteredRecent.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                {selectedFilter ? t("notes.title") : t("notes.recent")}
              </h2>
              <div className="flex-1 h-px bg-border"></div>
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/notes")}
                size="sm"
                className="ml-2"
              >
                <span className="hidden sm:inline">{t("common.showAll")}</span>
                <span className="sm:hidden">{t("common.all")}</span>
                <ArrowRight04Icon className="h-4 w-4 ml-1 sm:ml-2" />
              </Button>
            </div>

            {viewMode === "card" && (
              <Masonry
                breakpointCols={breakpointColumnsObj}
                className="flex w-auto -ml-6"
                columnClassName="pl-6 bg-clip-padding"
              >
                {filteredRecent.map((note) => (
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
            )}

            {viewMode === "list" && (
              <div className="space-y-3">
                {filteredRecent.map((note) => (
                  <NoteListItem
                    key={`recent-${note.category}-${note.id}`}
                    note={note}
                    onSelect={onSelectNote}
                    isPinned={isNotePinned(note)}
                    onTogglePin={handleTogglePin}
                    sharer={getNoteSharer(note)}
                  />
                ))}
              </div>
            )}

            {viewMode === "grid" && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {filteredRecent.map((note) => (
                  <NoteGridItem
                    key={`recent-${note.category}-${note.id}`}
                    note={note}
                    onSelect={onSelectNote}
                    isPinned={isNotePinned(note)}
                    onTogglePin={handleTogglePin}
                    sharer={getNoteSharer(note)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
