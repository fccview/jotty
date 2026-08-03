"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { ArrowDown01Icon, Folder01Icon } from "hugeicons-react";
import { cn } from "@/app/_utils/global-utils";
import { Category } from "@/app/_types";
import { CategoryTreeNode } from "./CategoryTreeNode";
import { useTranslations } from "next-intl";

const DROPDOWN_MAX_HEIGHT = 240;
const VIEWPORT_MARGIN = 12;

interface CategoryTreeSelectorProps {
  categories: Category[];
  selectedCategory: string;
  onCategorySelect: (categoryPath: string) => void;
  placeholder?: string;
  className?: string;
}

interface DropdownBox {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

export const CategoryTreeSelector = ({
  categories,
  selectedCategory,
  onCategorySelect,
  placeholder = "Select category...",
  className,
}: CategoryTreeSelectorProps) => {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [box, setBox] = useState<DropdownBox | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pickable = useMemo(
    () => categories.filter((cat) => !cat.isLoose),
    [categories]
  );

  const rootCategories = useMemo(
    () => pickable.filter((cat) => !cat.parent),
    [pickable]
  );
  const getSubCategories = useCallback(
    (parentPath: string) => pickable.filter((cat) => cat.parent === parentPath),
    [pickable]
  );

  const selectedCategoryName = useMemo(() => {
    if (!selectedCategory) return placeholder;
    const category = categories.find((cat) => cat.path === selectedCategory);
    return category ? category.name : selectedCategory;
  }, [selectedCategory, categories, placeholder]);

  const measure = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
    const above = rect.top - VIEWPORT_MARGIN;
    const dropUp = below < Math.min(DROPDOWN_MAX_HEIGHT, above) && above > below;
    const room = dropUp ? above : below;

    setBox({
      top: dropUp ? Math.max(VIEWPORT_MARGIN, rect.top - room - 4) : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      maxHeight: Math.max(120, Math.min(DROPDOWN_MAX_HEIGHT, room)),
    });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setBox(null);
      return;
    }

    measure();

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) =>
      event.key === "Escape" && setIsOpen(false);

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [isOpen, measure]);

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

  const list = (
    <div
      ref={dropdownRef}
      onMouseDown={(e) => e.stopPropagation()}
      style={
        box
          ? {
            top: box.top,
            left: box.left,
            width: box.width,
            maxHeight: box.maxHeight,
          }
          : undefined
      }
      className="jotty-category-tree-selector-dropdown fixed z-[10000] bg-background border border-input rounded-jotty shadow-lg overflow-y-auto"
    >
      <div className="p-2">
        {rootCategories.length === 0 && (
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-md lg:text-sm rounded-jotty cursor-pointer hover:bg-muted/50",
              !selectedCategory && "bg-primary/10 text-primary"
            )}
            onClick={() => handleCategoryClick("")}
          >
            <div className="w-5" />
            <Folder01Icon className="h-4 w-4 text-muted-foreground" />
            <span>{t('notes.uncategorized')}</span>
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
  );

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="jotty-category-tree-selector-button w-full px-3 py-2 text-left text-md lg:text-sm bg-background border border-input rounded-jotty hover:border-ring focus:outline-none focus:ring-none focus:ring-ring flex items-center gap-2"
      >
        <Folder01Icon className="h-4 w-4 text-muted-foreground" />
        <span className="truncate flex-1">{selectedCategoryName}</span>
        <ArrowDown01Icon
          className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
        />
      </button>

      {isOpen &&
        box &&
        typeof document !== "undefined" &&
        createPortal(list, document.body)}
    </div>
  );
};
