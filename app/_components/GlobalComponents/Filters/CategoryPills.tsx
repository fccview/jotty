"use client";

import { X } from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Category } from "@/app/_types";

interface CategoryPillsProps {
  categories: Category[];
  selectedCategories: string[];
  onCategoryToggle: (category: string) => void;
  onClearAll: () => void;
  className?: string;
}

export const CategoryPills = ({
  categories,
  selectedCategories,
  onCategoryToggle,
  onClearAll,
  className = "",
}: CategoryPillsProps) => {
  if (categories.length === 0) return null;

  return (
    <div className={`jotty-category-pills space-y-3 ${className}`}>
      <div className="jotty-category-pills-header flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          Filter by Category
        </h3>
        {selectedCategories.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear all
          </Button>
        )}
      </div>

      <div className="jotty-category-pills-list flex flex-wrap gap-2">
        {categories.map((category) => {
          const isSelected = selectedCategories.includes(category.name);

          return (
            <Button
              key={category.name}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => onCategoryToggle(category.name)}
              className={`h-7 px-3 text-xs transition-all ${
                isSelected
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "hover:bg-muted"
              }`}
            >
              {category.name}
              {isSelected && <X className="ml-1 h-3 w-3" />}
            </Button>
          );
        })}
      </div>
    </div>
  );
};
