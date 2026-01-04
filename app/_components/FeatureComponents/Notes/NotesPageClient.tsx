"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { File02Icon } from "hugeicons-react";
import { Note, SanitisedUser } from "@/app/_types";
import { EmptyState } from "@/app/_components/GlobalComponents/Cards/EmptyState";
import { NoteCard } from "@/app/_components/GlobalComponents/Cards/NoteCard";
import { usePagination } from "@/app/_hooks/usePagination";
import { useShortcut } from "@/app/_providers/ShortcutsProvider";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { togglePin } from "@/app/_server/actions/dashboard";
import { ItemTypes } from "@/app/_types/enums";
import Masonry from "react-masonry-css";
import { Loading } from "@/app/_components/GlobalComponents/Layout/Loading";
import { useTranslations } from "next-intl";
import { useSettings } from "@/app/_utils/settings-store";
import { NoteListItem } from "@/app/_components/GlobalComponents/Cards/NoteListItem";
import { NoteGridItem } from "@/app/_components/GlobalComponents/Cards/NoteGridItem";
import { useNotesFilter } from "@/app/_components/FeatureComponents/Notes/NotesClient";

interface NotesPageClientProps {
  initialNotes: Note[];
  user: SanitisedUser | null;
}

export const NotesPageClient = ({
  initialNotes,
  user,
}: NotesPageClientProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { openCreateNoteModal } = useShortcut();
  const { isInitialized } = useAppMode();
  const { viewMode } = useSettings();
  const {
    noteFilter,
    selectedCategories,
    recursive,
    itemsPerPage,
    setItemsPerPage,
    setPaginationInfo,
  } = useNotesFilter();
  const [isTogglingPin, setIsTogglingPin] = useState<string | null>(null);

  const filteredNotes = useMemo(() => {
    let filtered = [...initialNotes];

    if (noteFilter === "pinned") {
      const pinnedPaths = user?.pinnedNotes || [];
      filtered = filtered.filter((note) => {
        const uuidPath = `${note.category || "Uncategorized"}/${note.uuid || note.id}`;
        const idPath = `${note.category || "Uncategorized"}/${note.id}`;
        return pinnedPaths.includes(uuidPath) || pinnedPaths.includes(idPath);
      });
    } else if (noteFilter === "recent") {
      filtered = filtered
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        .slice(0, 50);
    }

    if (selectedCategories.length > 0) {
      filtered = filtered.filter((note) => {
        const noteCategory = note.category || "Uncategorized";
        if (recursive) {
          return selectedCategories.some(
            (selected) =>
              noteCategory === selected ||
              noteCategory.startsWith(selected + "/")
          );
        }
        return selectedCategories.includes(noteCategory);
      });
    }

    return filtered;
  }, [
    initialNotes,
    noteFilter,
    selectedCategories,
    recursive,
    user?.pinnedNotes,
  ]);

  const { currentPage, totalPages, paginatedItems, goToPage, totalItems, handleItemsPerPageChange } = usePagination({
    items: filteredNotes,
    itemsPerPage,
    onItemsPerPageChange: setItemsPerPage,
  });

  useEffect(() => {
    setPaginationInfo({
      currentPage,
      totalPages,
      totalItems,
      onPageChange: goToPage,
      onItemsPerPageChange: handleItemsPerPageChange,
    });
  }, [currentPage, totalPages, totalItems, goToPage, handleItemsPerPageChange, setPaginationInfo]);

  const handleTogglePin = async (note: Note) => {
    if (!user || isTogglingPin === note.id) return;

    setIsTogglingPin(note.id);
    try {
      const result = await togglePin(
        note.id,
        note.category || "Uncategorized",
        ItemTypes.NOTE
      );
      if (result.success) {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    } finally {
      setIsTogglingPin(null);
    }
  };

  const breakpointColumnsObj = {
    default: 3,
    900: 2,
    600: 1,
  };

  if (!isInitialized) {
    return <Loading />;
  }

  if (initialNotes.length === 0) {
    return (
      <EmptyState
        icon={<File02Icon className="h-10 w-10 text-muted-foreground" />}
        title={t('notes.noNotesYet')}
        description={t('notes.createFirstNote')}
        buttonText={t('notes.createNewNote')}
        onButtonClick={() => openCreateNoteModal()}
      />
    );
  }

  return (
    <div className="w-full">
      {paginatedItems.length === 0 ? (
        <div className="text-center py-12">
          <File02Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {t('notes.noNotesFound')}
          </h3>
          <p className="text-muted-foreground">
            {t('notes.tryAdjustingFilters')}
          </p>
        </div>
      ) : (
        <div className="mt-6">
          {viewMode === 'card' && (
            <Masonry
              breakpointCols={breakpointColumnsObj}
              className="flex w-auto -ml-4"
              columnClassName="pl-4 bg-clip-padding"
            >
              {paginatedItems.map((note) => (
                <div key={note.id} className="mb-4">
                  <NoteCard
                    note={note}
                    onSelect={(note) => {
                      const categoryPath = `${note.category || "Uncategorized"}/${note.id}`;
                      router.push(`/note/${categoryPath}`);
                    }}
                    isPinned={user?.pinnedNotes?.includes(
                      `${note.category || "Uncategorized"}/${note.id}`
                    )}
                    onTogglePin={() => handleTogglePin(note)}
                  />
                </div>
              ))}
            </Masonry>
          )}

          {viewMode === 'list' && (
            <div className="space-y-3">
              {paginatedItems.map((note) => (
                <NoteListItem
                  key={note.id}
                  note={note}
                  onSelect={(note) => {
                    const categoryPath = `${note.category || "Uncategorized"}/${note.id}`;
                    router.push(`/note/${categoryPath}`);
                  }}
                  isPinned={user?.pinnedNotes?.includes(
                    `${note.category || "Uncategorized"}/${note.id}`
                  )}
                  onTogglePin={() => handleTogglePin(note)}
                />
              ))}
            </div>
          )}

          {viewMode === 'grid' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {paginatedItems.map((note) => (
                <NoteGridItem
                  key={note.id}
                  note={note}
                  onSelect={(note) => {
                    const categoryPath = `${note.category || "Uncategorized"}/${note.id}`;
                    router.push(`/note/${categoryPath}`);
                  }}
                  isPinned={user?.pinnedNotes?.includes(
                    `${note.category || "Uncategorized"}/${note.id}`
                  )}
                  onTogglePin={() => handleTogglePin(note)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
