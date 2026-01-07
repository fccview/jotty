"use client";

import { SidebarWrapper } from "@/app/_components/GlobalComponents/Sidebar/SidebarWrapper";
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { CategoryMultiselect } from "@/app/_components/GlobalComponents/Dropdowns/CategoryMultiselect";
import { Pagination } from "@/app/_components/GlobalComponents/Layout/Pagination";
import { Category } from "@/app/_types";
import { useTranslations } from "next-intl";

interface FiltersSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  filterValue: string;
  filterOptions: Array<{ id: string; name: string }>;
  onFilterChange: (value: string) => void;
  categories: Category[];
  selectedCategories: string[];
  onCategorySelectionChange: (selectedPaths: string[]) => void;
  onClearAllCategories: () => void;
  recursive?: boolean;
  onRecursiveChange?: (recursive: boolean) => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  itemsPerPage?: number;
  onItemsPerPageChange?: (items: number) => void;
  totalItems?: number;
}

export const FiltersSidebar = ({
  isOpen,
  onClose,
  title,
  filterValue,
  filterOptions,
  onFilterChange,
  categories,
  selectedCategories,
  onCategorySelectionChange,
  onClearAllCategories,
  recursive,
  onRecursiveChange,
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  totalItems,
}: FiltersSidebarProps) => {
  const t = useTranslations();

  const showPagination = currentPage !== undefined && totalPages !== undefined && onPageChange;

  return (
    <SidebarWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={t('common.filters')}
      footer={
        showPagination ? (
          <div className="border-t border-border p-4">
            <Pagination
              currentPage={currentPage!}
              totalPages={totalPages!}
              onPageChange={onPageChange!}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={onItemsPerPageChange}
              totalItems={totalItems}
              dropdownDirection="up"
              variant="sidebar"
            />
          </div>
        ) : undefined
      }
    >
      <div className="space-y-4 px-2">
        <div>
          <label className="text-md lg:text-sm font-medium text-foreground mb-2 block">
            {title}
          </label>
          <Dropdown
            value={filterValue}
            options={filterOptions}
            onChange={onFilterChange}
            className="w-full"
          />
        </div>

        <CategoryMultiselect
          categories={categories}
          selectedCategories={selectedCategories}
          onSelectionChange={onCategorySelectionChange}
          onClearAll={onClearAllCategories}
          recursive={recursive}
          placeholder={t('common.filterByCategories')}
          onRecursiveChange={onRecursiveChange}
        />
      </div>
    </SidebarWrapper>
  );
};
