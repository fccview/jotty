"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { Note, Category, User } from "@/app/_types";
import { EmptyState } from "@/app/_components/GlobalComponents/Cards/EmptyState";
import { NoteCard } from "@/app/_components/GlobalComponents/Cards/NoteCard";
import { Pagination } from "@/app/_components/GlobalComponents/Layout/Pagination";
import { SiteHeader } from "@/app/_components/GlobalComponents/Layout/SiteHeader";
import { FilterSidebar } from "@/app/_components/GlobalComponents/Layout/FilterSidebar";
import { usePagination } from "@/app/_hooks/usePagination";
import { useShortcut } from "@/app/_providers/ShortcutsProvider";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import Masonry from "react-masonry-css";
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
  const router = useRouter();
  const t = useTranslations();
  const { openCreateNoteModal } = useShortcut();
  const { isInitialized } = useAppMode();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [noteFilter, setNoteFilter] = useState<NoteFilter>("all");
  const [itemsPerPage, setItemsPerPage] = useState(3);

  const filterOptions = [
    { id: "all", name: "All Notes" },
    { id: "recent", name: "Recent" },
    { id: "pinned", name: "Pinned" },
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
      filtered = filtered.filter((note) =>
        selectedCategories.includes(note.category || "Uncategorized")
      );
    }

    return filtered;
  }, [initialNotes, noteFilter, selectedCategories, user?.pinnedNotes]);

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

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleClearAllCategories = () => {
    setSelectedCategories([]);
  };

  const breakpointColumnsObj = {
    default: 3,
    900: 2,
    600: 1,
  };

  if (!isInitialized) {
    return (
      <div className="flex h-screen bg-background w-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (initialNotes.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <SiteHeader
          title={t("notes.all_notes")}
          description="Browse and manage all your notes"
        />
        <EmptyState
          icon={<FileText className="h-10 w-10 text-muted-foreground" />}
          title={t("notes.no_notes_yet")}
          description={t("notes.create_your_first_note")}
          buttonText={t("notes.create_note")}
          onButtonClick={() => openCreateNoteModal()}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <SiteHeader
        title={t("notes.all_notes")}
        description={t("notes.browse_and_manage_all_your_notes")}
      />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <FilterSidebar
            title={t("global.filter_by_type")}
            filterValue={noteFilter}
            filterOptions={filterOptions}
            onFilterChange={(value) => setNoteFilter(value as NoteFilter)}
            categories={initialCategories}
            selectedCategories={selectedCategories}
            onCategoryToggle={handleCategoryToggle}
            onClearAllCategories={handleClearAllCategories}
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
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {t("notes.no_notes_found")}
              </h3>
              <p className="text-muted-foreground">
                {t("notes.try_adjusting_your_filters_or_create_a_new_note")}
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
                      onTogglePin={() => { }}
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
