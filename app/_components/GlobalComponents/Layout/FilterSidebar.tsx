"use client";

import { Filter } from "lucide-react";
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { CategoryPills } from "@/app/_components/GlobalComponents/Filters/CategoryPills";
import { Category } from "@/app/_types";

interface FilterSidebarProps {
  title: string;
  filterValue: string;
  filterOptions: Array<{ id: string; name: string }>;
  onFilterChange: (value: string) => void;
  categories: Category[];
  selectedCategories: string[];
  onCategoryToggle: (category: string) => void;
  onClearAllCategories: () => void;
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
  onCategoryToggle,
  onClearAllCategories,
  pagination,
  className = "",
}: FilterSidebarProps) => {
  return (
    <div className={`lg:sticky lg:top-20 space-y-6 ${className}`}>
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-foreground">Filters</span>
        </div>

        <div className="space-y-4">
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

          <CategoryPills
            categories={categories}
            selectedCategories={selectedCategories}
            onCategoryToggle={onCategoryToggle}
            onClearAll={onClearAllCategories}
          />
        </div>
      </div>

      {pagination}
    </div>
  );
};
