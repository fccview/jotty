"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { File02Icon } from "hugeicons-react";
import { Note, Category, User } from "@/app/_types";
import { EmptyState } from "@/app/_components/GlobalComponents/Cards/EmptyState";
import { NoteCard } from "@/app/_components/GlobalComponents/Cards/NoteCard";
import { Pagination } from "@/app/_components/GlobalComponents/Layout/Pagination";
import { SiteHeader } from "@/app/_components/GlobalComponents/Layout/SiteHeader";
import { FilterSidebar } from "@/app/_components/GlobalComponents/Layout/FilterSidebar";
import { usePagination } from "@/app/_hooks/usePagination";
import { useShortcut } from "@/app/_providers/ShortcutsProvider";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { togglePin } from "@/app/_server/actions/dashboard";
import { ItemTypes } from "@/app/_types/enums";
import Masonry from "react-masonry-css";
import { Loading } from "@/app/_components/GlobalComponents/Layout/Loading";
import { useTranslations } from "next-intl";

interface NotesPageClientProps {
  initialNotes: Note[];
  initialCategories: Category[];
  user: User | null;
}

type NoteFilter = "all" | "recent" | "pinned";

export const NotesPageClient = ({
  initialNotes,
  initialCategories,
  user,
}: NotesPageClientProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { openCreateNoteModal } = useShortcut();
  const { isInitialized } = useAppMode();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [noteFilter, setNoteFilter] = useState<NoteFilter>(user?.defaultNoteFilter || "all");
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [isTogglingPin, setIsTogglingPin] = useState<string | null>(null);
  const [recursive, setRecursive] = useState(false);

  const filterOptions = [
    { id: "all", name: t('notes.allNotes') },
    { id: "recent", name: t('notes.recent') },
    { id: "pinned", name: t('common.pinned') },
  ];

  const filteredNotes = useMemo(() => {
    let filtered = [...initialNotes];

    if (noteFilter === "pinned") {
      const pinnedPaths = user?.pinnedNotes || [];
      filtered = filtered.filter((note) => {
        const itemPath = `${note.category || "Uncategorized"}/${note.id}`;
        return pinnedPaths.includes(itemPath);
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

  const {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
    totalItems,
    handleItemsPerPageChange,
  } = usePagination({
    items: filteredNotes,
    itemsPerPage,
    onItemsPerPageChange: setItemsPerPage,
  });

  const handleClearAllCategories = () => {
    setSelectedCategories([]);
  };

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
      <div className="max-w-7xl mx-auto px-4 py-8">
        <SiteHeader
          title={t('notes.allNotes')}
          description={t('notes.browseAndManage')}
        />
        <EmptyState
          icon={<File02Icon className="h-10 w-10 text-muted-foreground" />}
          title={t('notes.noNotesYet')}
          description={t('notes.createFirstNote')}
          buttonText={t('notes.createNewNote')}
          onButtonClick={() => openCreateNoteModal()}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <SiteHeader
        title={t('notes.allNotes')}
        description={t('notes.browseAndManage')}
      />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <FilterSidebar
            title={t('notes.byType')}
            filterValue={noteFilter}
            filterOptions={filterOptions}
            onFilterChange={(value) => setNoteFilter(value as NoteFilter)}
            categories={initialCategories}
            selectedCategories={selectedCategories}
            onCategorySelectionChange={setSelectedCategories}
            onClearAllCategories={handleClearAllCategories}
            recursive={recursive}
            onRecursiveChange={setRecursive}
            pagination={
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={handleItemsPerPageChange}
                totalItems={totalItems}
              />
            }
          />
        </div>

        <div className="lg:col-span-3">
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
            <>
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
                        const categoryPath = `${note.category || "Uncategorized"
                          }/${note.id}`;
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};
