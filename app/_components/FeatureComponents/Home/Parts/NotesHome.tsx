"use client";

import {
  Plus,
  FileText,
  FolderOpen,
  Pin,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Note, Category, User } from "@/app/_types";
import { EmptyState } from "@/app/_components/GlobalComponents/Cards/EmptyState";
import { NoteCard } from "@/app/_components/GlobalComponents/Cards/NoteCard";
import Masonry from "react-masonry-css";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useNotesHome } from "@/app/_hooks/useNotesHome";
import { useTranslations } from "next-intl";

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
  const {
    sensors,
    handleDragEnd,
    pinned,
    recent,
    breakpointColumnsObj,
    handleTogglePin,
    isNotePinned,
  } = useNotesHome({ notes, categories, user });
  const t = useTranslations();

  if (notes.length === 0) {
    return (
      <div className="flex-1 overflow-auto bg-background h-full">
        <EmptyState
          icon={<FileText className="h-10 w-10 text-muted-foreground" />}
          title={t("notes.no_notes_yet")}
          description={t("notes.create_your_first_note")}
          buttonText={t("notes.create_note")}
          onButtonClick={() => onCreateModal()}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-background h-full">
      <div className="max-w-full pt-6 pb-4 px-4 lg:pt-8 lg:pb-8 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 lg:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-foreground tracking-tight">
              {t("notes.title")}
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
              {t("notes.description")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/notes")}
              size="sm"
              className="flex-1 sm:size-lg"
            >
              <span className="hidden sm:inline">{t("notes.all_notes")}</span>
              <span className="sm:hidden">{t("notes.all_notes_mobile")}</span>
            </Button>
            <Button
              onClick={() => onCreateModal()}
              size="sm"
              className="flex-1 sm:size-lg"
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{t("notes.new_note")}</span>
              <span className="sm:hidden">{t("global.new")}</span>
            </Button>
          </div>
        </div>

        {pinned.length > 0 && (
          <div className="mb-8 lg:mb-12 overflow-hidden">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Pin className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                {t("global.pinned")}
              </h2>
              <div className="flex-1 h-px bg-border"></div>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={pinned.map((note) => note.id)}
                strategy={verticalListSortingStrategy}
              >
                <Masonry
                  breakpointCols={breakpointColumnsObj}
                  className="flex w-auto -ml-6"
                  columnClassName="pl-6 bg-clip-padding"
                >
                  {pinned.map((note) => (
                    <div
                      key={`pinned-${note.category}-${note.id}`}
                      className="mb-6"
                    >
                      <NoteCard
                        note={note}
                        onSelect={onSelectNote}
                        isPinned={true}
                        onTogglePin={handleTogglePin}
                        isDraggable={true}
                      />
                    </div>
                  ))}
                </Masonry>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {recent.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                {t("notes.recent_notes")}
              </h2>
              <div className="flex-1 h-px bg-border"></div>
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/notes")}
                size="sm"
                className="ml-2"
              >
                <span className="hidden sm:inline">{t("notes.show_all")}</span>
                <span className="sm:hidden">{t("global.all")}</span>
                <ArrowRight className="h-4 w-4 ml-1 sm:ml-2" />
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
                  />
                </div>
              ))}
            </Masonry>
          </div>
        )}

        {notes.length > 12 && (
          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              {t("notes.showing_notes", { count: recent.length, total: notes.length })}
              {t("notes.use_sidebar_to_browse_all_or_search_above")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
