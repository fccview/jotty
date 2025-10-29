"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ChevronDown, Folder } from "lucide-react";
import { cn } from "@/app/_utils/global-utils";
import { Category } from "@/app/_types";
import { CategoryTreeNode } from "./CategoryTreeNode";

interface CategoryTreeSelectorProps {
  categories: Category[];
  selectedCategory: string;
  onCategorySelect: (categoryPath: string) => void;
  placeholder?: string;
  className?: string;
  isInModal?: boolean;
}

export const CategoryTreeSelector = ({
  categories,
  selectedCategory,
  onCategorySelect,
  placeholder = "Select category...",
  className,
  isInModal = false,
}: CategoryTreeSelectorProps) => {
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

  const selectedCategoryName = useMemo(() => {
    if (!selectedCategory) return placeholder;
    const category = categories.find((cat) => cat.path === selectedCategory);
    return category ? category.name : selectedCategory;
  }, [selectedCategory, categories, placeholder]);

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

  const handleCategoryClick = (categoryPath: string) => {
    onCategorySelect(categoryPath);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left text-sm bg-background border border-input rounded-md hover:border-ring focus:outline-none focus:ring-2 focus:ring-ring flex items-center gap-2"
      >
        <Folder className="h-4 w-4 text-muted-foreground" />
        <span className="truncate flex-1">{selectedCategoryName}</span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute w-full z-40 mt-1 bg-background border border-input rounded-md shadow-lg max-h-60 overflow-y-auto",
            isInModal ? "bottom-full lg:top-full lg:bottom-auto" : "top-full"
          )}
        >
          <div className="p-2">
            {rootCategories.length === 0 && (
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-muted/50",
                  !selectedCategory && "bg-primary/10 text-primary"
                )}
                onClick={() => handleCategoryClick("")}
              >
                <div className="w-5" />
                <Folder className="h-4 w-4 text-muted-foreground" />
                <span>Uncategorized</span>
              </div>
            )}
            {rootCategories.map((category) => (
              <CategoryTreeNode
                key={category.path}
                category={category}
                level={0}
                getSubCategories={getSubCategories}
                selectedCategory={selectedCategory}
                expandedCategories={expandedCategories}
                onCategoryClick={handleCategoryClick}
                onToggleExpanded={toggleExpanded}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
