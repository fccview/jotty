"use client";

import { createContext, useContext, useState } from "react";
import { Layout } from "@/app/_components/GlobalComponents/Layout/Layout";
import { FiltersSidebar } from "@/app/_components/FeatureComponents/Sidebar/FiltersSidebar";
import { Pagination } from "@/app/_components/GlobalComponents/Layout/Pagination";
import { Category, SanitisedUser } from "@/app/_types";
import { useShortcut } from "@/app/_providers/ShortcutsProvider";
import { useTranslations } from "next-intl";

interface NotesClientProps {
  categories: Category[];
  user: SanitisedUser | null;
  children: React.ReactNode;
}

type NoteFilter = "all" | "recent" | "pinned";

interface NotesFilterContextType {
  noteFilter: NoteFilter;
  setNoteFilter: (value: NoteFilter) => void;
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
  recursive: boolean;
  setRecursive: (recursive: boolean) => void;
  itemsPerPage: number;
  setItemsPerPage: (items: number) => void;
  paginationInfo: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (items: number) => void;
  } | null;
  setPaginationInfo: (info: NotesFilterContextType['paginationInfo']) => void;
}

const NotesFilterContext = createContext<NotesFilterContextType | null>(null);

export const useNotesFilter = () => {
  const context = useContext(NotesFilterContext);
  if (!context) {
    throw new Error("useNotesFilter must be used within NotesClient");
  }
  return context;
};

export const NotesClient = ({
  categories,
  user,
  children,
}: NotesClientProps) => {
  const t = useTranslations();
  const { openSettings, openCreateNoteModal, openCreateCategoryModal } = useShortcut();

  const [noteFilter, setNoteFilter] = useState<NoteFilter>(user?.defaultNoteFilter || "all");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [recursive, setRecursive] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [paginationInfo, setPaginationInfo] = useState<NotesFilterContextType['paginationInfo']>(null);

  const filterOptions = [
    { id: "all", name: t('notes.allNotes') },
    { id: "recent", name: t('notes.recent') },
    { id: "pinned", name: t('common.pinned') },
  ];

  const handleClearAllCategories = () => {
    setSelectedCategories([]);
  };

  return (
    <NotesFilterContext.Provider
      value={{
        noteFilter,
        setNoteFilter,
        selectedCategories,
        setSelectedCategories,
        recursive,
        setRecursive,
        itemsPerPage,
        setItemsPerPage,
        paginationInfo,
        setPaginationInfo,
      }}
    >
      <Layout
        categories={categories}
        onOpenSettings={openSettings}
        onOpenCreateModal={openCreateNoteModal}
        onOpenCategoryModal={openCreateCategoryModal}
        user={user}
        customSidebar={({ isOpen, onClose }) => (
          <FiltersSidebar
            isOpen={isOpen}
            onClose={onClose}
            title={t('notes.byType')}
            filterValue={noteFilter}
            filterOptions={filterOptions}
            onFilterChange={(value) => {
              setNoteFilter(value as NoteFilter);
            }}
            categories={categories}
            selectedCategories={selectedCategories}
            onCategorySelectionChange={setSelectedCategories}
            onClearAllCategories={handleClearAllCategories}
            recursive={recursive}
            onRecursiveChange={setRecursive}
            currentPage={paginationInfo?.currentPage}
            totalPages={paginationInfo?.totalPages}
            onPageChange={paginationInfo?.onPageChange}
            itemsPerPage={paginationInfo?.totalItems !== undefined ? itemsPerPage : undefined}
            onItemsPerPageChange={paginationInfo?.onItemsPerPageChange}
            totalItems={paginationInfo?.totalItems}
          />
        )}
      >
        <div className="w-full px-4 py-6 h-full overflow-y-auto">
          {children}
        </div>
      </Layout>
    </NotesFilterContext.Provider>
  );
};
