"use client";

import { useMemo } from "react";
import { ArrowDown01Icon, MultiplicationSignIcon, Folder01Icon } from "hugeicons-react";
import { cn } from "@/app/_utils/global-utils";
import { Category } from "@/app/_types";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useTranslations } from "next-intl";
import { Popover } from "./Popover";
import { CategoryCheckTree } from "./CategoryCheckTree";

interface CategoryMultiselectProps {
  categories: Category[];
  selectedCategories: string[];
  onSelectionChange: (selectedPaths: string[]) => void;
  onClearAll?: () => void;
  placeholder?: string;
  className?: string;
  recursive?: boolean;
  onRecursiveChange?: (recursive: boolean) => void;
}

export const CategoryMultiselect = ({
  categories,
  selectedCategories,
  onSelectionChange,
  onClearAll,
  placeholder,
  className,
  recursive = false,
  onRecursiveChange,
}: CategoryMultiselectProps) => {
  const t = useTranslations();

  const selectedCategoryObjects = useMemo(
    () => categories.filter((cat) => selectedCategories.includes(cat.path)),
    [categories, selectedCategories]
  );

  const displayText = useMemo(() => {
    if (selectedCategories.length === 0) return placeholder || t("common.filterByCategories");
    if (selectedCategories.length === 1) {
      const category = categories.find((cat) => cat.path === selectedCategories[0]);
      return category ? category.name : selectedCategories[0];
    }
    return `${selectedCategories.length} ${t("notes.categories")}`;
  }, [selectedCategories, categories, placeholder, t]);

  const handleCategoryToggle = (categoryPath: string) =>
    onSelectionChange(
      selectedCategories.includes(categoryPath)
        ? selectedCategories.filter((path) => path !== categoryPath)
        : [...selectedCategories, categoryPath]
    );

  return (
    <div className={cn("relative", className)}>
      <div className="jotty-category-multiselect space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-md lg:text-sm font-medium text-foreground">{t("common.byCategory")}</h3>
          <div className="flex items-center gap-2">
            {onRecursiveChange && (
              <label className="flex items-center gap-1 text-sm lg:text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={recursive}
                  onChange={(e) => onRecursiveChange(e.target.checked)}
                  className="h-3 w-3"
                />
                {t("common.recursive")}
              </label>
            )}
            {selectedCategories.length > 0 && onClearAll && (
              <Button variant="ghost" size="sm" onClick={onClearAll} className="h-6 px-2 text-xs">
                {t("common.clear")}
              </Button>
            )}
          </div>
        </div>

        <Popover
          menuClassName="jotty-category-multiselect-dropdown w-full z-40 bg-background border-input max-h-80 overflow-y-auto p-2"
          trigger={({ isOpen, toggle }) => (
            <button
              type="button"
              onClick={toggle}
              className="jotty-category-multiselect-button w-full px-3 py-2 text-left text-md lg:text-sm bg-background border border-input rounded-jotty hover:border-ring focus:outline-none focus:ring-none focus:ring-ring flex items-center gap-2 min-h-[40px]"
            >
              <Folder01Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate flex-1">{displayText}</span>
              <ArrowDown01Icon
                className={cn("h-4 w-4 transition-transform flex-shrink-0", isOpen && "rotate-180")}
              />
            </button>
          )}
        >
          {() => (
            <CategoryCheckTree
              categories={categories}
              selected={selectedCategories}
              recursive={recursive}
              onToggle={handleCategoryToggle}
              countOf={(category) => category.count}
            />
          )}
        </Popover>

        {selectedCategories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedCategoryObjects.map((category) => (
              <div
                key={category.path}
                className="inline-flex items-center gap-1 px-2 py-1 text-sm lg:text-xs bg-primary/10 text-primary rounded-jotty"
              >
                <span>{category.name}</span>
                <button
                  type="button"
                  onClick={() => handleCategoryToggle(category.path)}
                  className="hover:bg-primary/20 rounded p-0.5"
                >
                  <MultiplicationSignIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
