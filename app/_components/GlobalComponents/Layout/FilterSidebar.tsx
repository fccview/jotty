"use client";

import { Filter } from "lucide-react";
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { CategoryMultiselect } from "@/app/_components/GlobalComponents/Dropdowns/CategoryMultiselect";
import { Category } from "@/app/_types";

interface FilterSidebarProps {
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
  pagination?: React.ReactNode;
  className?: string;
}

export const FilterSidebar = ({
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
  pagination,
  className = "",
}: FilterSidebarProps) => {
  return (
    <div
      className={`jotty-filter-sidebar lg:sticky lg:top-20 space-y-6 ${className}`}
    >
      <div className="jotty-filter-sidebar-header bg-card border border-border rounded-lg p-4">
        <div className="jotty-filter-sidebar-header-icon flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="jotty-filter-sidebar-header-title font-medium text-foreground">
            Filters
          </span>
        </div>

        <div className="jotty-filter-sidebar-content space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
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
            onRecursiveChange={onRecursiveChange}
          />
        </div>
      </div>

      {pagination}
    </div>
  );
};
