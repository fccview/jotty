"use client";

import { X } from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Category } from "@/app/_types";
import { useTranslations } from "next-intl";

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
  const t = useTranslations();

  if (categories.length === 0) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          {t("global.filter_by_type")}
        </h3>
        {selectedCategories.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            {t("cards.clear_all")}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const isSelected = selectedCategories.includes(category.name);

          return (
            <Button
              key={category.name}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => onCategoryToggle(category.name)}
              className={`h-7 px-3 text-xs transition-all ${isSelected
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
