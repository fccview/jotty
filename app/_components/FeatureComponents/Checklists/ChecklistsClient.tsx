"use client";

import { createContext, useContext, useState } from "react";
import { Layout } from "@/app/_components/GlobalComponents/Layout/Layout";
import { FiltersSidebar } from "@/app/_components/FeatureComponents/Sidebar/FiltersSidebar";
import { Pagination } from "@/app/_components/GlobalComponents/Layout/Pagination";
import { Category, User } from "@/app/_types";
import { useShortcut } from "@/app/_providers/ShortcutsProvider";
import { useTranslations } from "next-intl";

interface ChecklistsClientProps {
  categories: Category[];
  user: User | null;
  children: React.ReactNode;
}

type ChecklistFilter = "all" | "completed" | "incomplete" | "pinned" | "task" | "simple";

interface ChecklistsFilterContextType {
  checklistFilter: ChecklistFilter;
  setChecklistFilter: (value: ChecklistFilter) => void;
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
  setPaginationInfo: (info: ChecklistsFilterContextType['paginationInfo']) => void;
}

const ChecklistsFilterContext = createContext<ChecklistsFilterContextType | null>(null);

export const useChecklistsFilter = () => {
  const context = useContext(ChecklistsFilterContext);
  if (!context) {
    throw new Error("useChecklistsFilter must be used within ChecklistsClient");
  }
  return context;
};

export const ChecklistsClient = ({
  categories,
  user,
  children,
}: ChecklistsClientProps) => {
  const t = useTranslations('checklists');
  const { openSettings, openCreateChecklistModal, openCreateCategoryModal } = useShortcut();

  const [checklistFilter, setChecklistFilter] = useState<ChecklistFilter>(user?.defaultChecklistFilter || "all");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [recursive, setRecursive] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [paginationInfo, setPaginationInfo] = useState<ChecklistsFilterContextType['paginationInfo']>(null);

  const filterOptions = [
    { id: "all", name: t('allChecklists') },
    { id: "completed", name: t('completed') },
    { id: "incomplete", name: t('incomplete') },
    { id: "pinned", name: t('pinned') },
    { id: "task", name: t('taskLists') },
    { id: "simple", name: t('simpleLists') },
  ];

  const handleClearAllCategories = () => {
    setSelectedCategories([]);
  };

  return (
    <ChecklistsFilterContext.Provider
      value={{
        checklistFilter,
        setChecklistFilter,
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
        onOpenCreateModal={openCreateChecklistModal}
        onOpenCategoryModal={openCreateCategoryModal}
        user={user}
        customSidebar={({ isOpen, onClose }) => (
          <FiltersSidebar
            isOpen={isOpen}
            onClose={onClose}
            title={t('byStatus')}
            filterValue={checklistFilter}
            filterOptions={filterOptions}
            onFilterChange={(value) => {
              setChecklistFilter(value as ChecklistFilter);
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
    </ChecklistsFilterContext.Provider>
  );
};
