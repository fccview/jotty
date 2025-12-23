"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  ArrowDown01Icon,
  MultiplicationSignIcon,
  Folder01Icon,
  Folder02Icon,
  ArrowRight01Icon,
} from "hugeicons-react";
import { cn } from "@/app/_utils/global-utils";
import { Category } from "@/app/_types";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useTranslations } from "next-intl";

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

interface CategoryTreeNodeProps {
  category: Category;
  level: number;
  selectedCategories: string[];
  expandedCategories: Set<string>;
  onCategoryToggle: (categoryPath: string) => void;
  onToggleExpanded: (categoryPath: string) => void;
  getSubCategories: (parentPath: string) => Category[];
}

const CategoryTreeNode = ({
  category,
  level,
  selectedCategories,
  expandedCategories,
  onCategoryToggle,
  onToggleExpanded,
  getSubCategories,
}: CategoryTreeNodeProps) => {
  const subCategories = getSubCategories(category.path);
  const isExpanded = expandedCategories.has(category.path);
  const hasSubCategories = subCategories.length > 0;
  const isSelected = selectedCategories.includes(category.path);

  return (
    <div key={category.path} className="jotty-category-tree-node select-none">
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 text-sm rounded-jotty cursor-pointer hover:bg-muted/50",
          isSelected && "bg-primary/10 text-primary border border-primary/20"
        )}
        style={{ paddingLeft: `${12 + level * 20}px` }}
        onClick={() => onCategoryToggle(category.path)}
      >
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (hasSubCategories) onToggleExpanded(category.path);
          }}
          className={cn(
            "p-0.5 rounded",
            hasSubCategories ? "hover:bg-muted" : "cursor-default"
          )}
          aria-label={
            hasSubCategories ? (isExpanded ? "Collapse" : "Expand") : undefined
          }
        >
          {hasSubCategories ? (
            isExpanded ? (
              <ArrowDown01Icon className="h-4 w-4" />
            ) : (
              <ArrowRight01Icon className="h-4 w-4" />
            )
          ) : (
            <ArrowRight01Icon className="h-4 w-4 opacity-20" />
          )}
        </button>

        {isExpanded ? (
          <Folder02Icon className="h-4 w-4 text-primary" />
        ) : (
          <Folder01Icon className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="truncate flex-1">{category.name}</span>
        {category.count > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            {category.count}
          </span>
        )}
      </div>

      {isExpanded && hasSubCategories && (
        <div className="ml-2">
          {subCategories.map((sub) => (
            <CategoryTreeNode
              key={sub.path}
              category={sub}
              level={level + 1}
              getSubCategories={getSubCategories}
              selectedCategories={selectedCategories}
              expandedCategories={expandedCategories}
              onCategoryToggle={onCategoryToggle}
              onToggleExpanded={onToggleExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const CategoryMultiselect = ({
  categories,
  selectedCategories,
  onSelectionChange,
  onClearAll,
  placeholder = "Filter by categories...",
  className,
  recursive = false,
  onRecursiveChange,
}: CategoryMultiselectProps) => {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const rootCategories = useMemo(
    () => categories.filter((cat) => !cat.parent),
    [categories]
  );
  const getSubCategories = useCallback(
    (parentPath: string) =>
      categories.filter((cat) => cat.parent === parentPath),
    [categories]
  );

  const selectedCategoryObjects = useMemo(() => {
    return categories.filter((cat) => selectedCategories.includes(cat.path));
  }, [categories, selectedCategories]);

  const displayText = useMemo(() => {
    if (selectedCategories.length === 0) return placeholder;
    if (selectedCategories.length === 1) {
      const category = categories.find(
        (cat) => cat.path === selectedCategories[0]
      );
      return category ? category.name : selectedCategories[0];
    }
    return `${selectedCategories.length} categories selected`;
  }, [selectedCategories, categories, placeholder]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) =>
      event.key === "Escape" && setIsOpen(false);

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const toggleExpanded = (categoryPath: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryPath)) {
        newSet.delete(categoryPath);
      } else {
        newSet.add(categoryPath);
      }
      return newSet;
    });
  };

  const handleCategoryToggle = (categoryPath: string) => {
    const newSelected = selectedCategories.includes(categoryPath)
      ? selectedCategories.filter((path) => path !== categoryPath)
      : [...selectedCategories, categoryPath];
    onSelectionChange(newSelected);
  };

  const handleRemoveCategory = (categoryPath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    handleCategoryToggle(categoryPath);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="jotty-category-multiselect space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">{t('common.byCategory')}</h3>
          <div className="flex items-center gap-2">
            {onRecursiveChange && (
              <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={recursive}
                  onChange={(e) => onRecursiveChange(e.target.checked)}
                  className="h-3 w-3"
                />
                {t('common.recursive')}
              </label>
            )}
            {selectedCategories.length > 0 && onClearAll && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="h-6 px-2 text-xs"
              >{t('common.clear')}</Button>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="jotty-category-multiselect-button w-full px-3 py-2 text-left text-sm bg-background border border-input rounded-jotty hover:border-ring focus:outline-none focus:ring-none focus:ring-ring flex items-center gap-2 min-h-[40px]"
        >
          <Folder01Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="truncate flex-1">{displayText}</span>
          <ArrowDown01Icon
            className={cn(
              "h-4 w-4 transition-transform flex-shrink-0",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {selectedCategories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedCategoryObjects.map((category) => (
              <div
                key={category.path}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-jotty"
              >
                <span>{category.name}</span>
                <button
                  type="button"
                  onClick={(e) => handleRemoveCategory(category.path, e)}
                  className="hover:bg-primary/20 rounded p-0.5"
                >
                  <MultiplicationSignIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {isOpen && (
        <div className="jotty-category-multiselect-dropdown absolute w-full z-40 mt-1 bg-background border border-input rounded-jotty shadow-lg max-h-80 overflow-y-auto">
          <div className="p-2">
            {rootCategories.length === 0 && categories.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No categories available
              </div>
            )}
            {rootCategories.map((category) => (
              <CategoryTreeNode
                key={category.path}
                category={category}
                level={0}
                getSubCategories={getSubCategories}
                selectedCategories={selectedCategories}
                expandedCategories={expandedCategories}
                onCategoryToggle={handleCategoryToggle}
                onToggleExpanded={toggleExpanded}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
