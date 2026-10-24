"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown01Icon, ArrowRight01Icon, Tick02Icon } from "hugeicons-react";
import { Category } from "@/app/_types";
import { cn } from "@/app/_utils/global-utils";
import { isInCategory } from "@/app/_utils/category-path-utils";
import { SMALL_RADIUS_CLASS } from "@/app/_consts/styling";

const INDENT = 16;
const TOGGLE_KEYS = [" ", "Enter"];
const BASE_PADDING = 8;
const NO_CHILDREN: Category[] = [];

interface CategoryCheckTreeProps {
  categories: Category[];
  selected: string[];
  recursive: boolean;
  onToggle: (path: string) => void;
  countOf?: (category: Category) => number;
  className?: string;
}

interface NodeProps extends Omit<CategoryCheckTreeProps, "categories" | "className"> {
  category: Category;
  level: number;
  childrenOf: (path: string) => Category[];
  expanded: Set<string>;
  onExpand: (path: string) => void;
}

const CheckBox = ({ checked }: { checked: boolean }) => (
  <span
    className={cn(
      "inline-flex h-4 w-4 items-center justify-center border shrink-0",
      SMALL_RADIUS_CLASS,
      checked ? "bg-primary border-primary text-primary-foreground" : "border-input bg-background",
    )}
  >
    {checked && <Tick02Icon className="h-3 w-3" />}
  </span>
);

const CategoryNode = ({
  category,
  level,
  childrenOf,
  expanded,
  onExpand,
  selected,
  recursive,
  onToggle,
  countOf,
}: NodeProps) => {
  const t = useTranslations();
  const children = childrenOf(category.path);
  const isOpen = expanded.has(category.path);
  const isSelected = selected.includes(category.path);
  const isInherited =
    !isSelected &&
    recursive &&
    selected.some((path) => isInCategory(category.path, path, true));

  return (
    <div className="jotty-category-tree-node select-none">
      <div
        role="checkbox"
        aria-checked={isSelected || isInherited}
        tabIndex={0}
        className={cn(
          "flex items-center gap-2 py-1.5 pr-2 text-md lg:text-sm rounded-jotty cursor-pointer border border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          isSelected
            ? "bg-primary/10 text-primary border-primary/20"
            : isInherited
              ? "text-primary/80 hover:bg-muted/50"
              : "hover:bg-muted/50",
        )}
        style={{ paddingLeft: `${BASE_PADDING + level * INDENT}px` }}
        onClick={() => onToggle(category.path)}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (!TOGGLE_KEYS.includes(event.key)) return;
          event.preventDefault();
          onToggle(category.path);
        }}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (children.length) onExpand(category.path);
          }}
          className={cn("p-0.5 rounded", children.length ? "hover:bg-muted" : "cursor-default")}
          aria-label={children.length ? (isOpen ? t("common.collapseAll") : t("common.expandAll")) : undefined}
        >
          {children.length && isOpen ? (
            <ArrowDown01Icon className="h-3.5 w-3.5" />
          ) : (
            <ArrowRight01Icon className={cn("h-3.5 w-3.5", !children.length && "opacity-20")} />
          )}
        </button>
        <CheckBox checked={isSelected || isInherited} />
        <span className="truncate flex-1">{category.name}</span>
        {countOf && (
          <span className="text-md lg:text-xs text-muted-foreground ml-auto font-mono">
            {countOf(category)}
          </span>
        )}
      </div>
      {isOpen &&
        children.map((child) => (
          <CategoryNode
            key={child.path}
            category={child}
            level={level + 1}
            childrenOf={childrenOf}
            expanded={expanded}
            onExpand={onExpand}
            selected={selected}
            recursive={recursive}
            onToggle={onToggle}
            countOf={countOf}
          />
        ))}
    </div>
  );
};

export const CategoryCheckTree = ({
  categories,
  selected,
  recursive,
  onToggle,
  countOf,
  className,
}: CategoryCheckTreeProps) => {
  const t = useTranslations();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const byParent = useMemo(() => {
    const groups = new Map<string, Category[]>();
    categories.forEach((category) => {
      if (!category.parent) return;
      const siblings = groups.get(category.parent);
      if (siblings) siblings.push(category);
      else groups.set(category.parent, [category]);
    });
    return groups;
  }, [categories]);

  const childrenOf = useCallback((path: string) => byParent.get(path) || NO_CHILDREN, [byParent]);

  const onExpand = (path: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  const roots = categories.filter((category) => !category.parent);

  if (!roots.length) {
    return (
      <div className="px-3 py-2 text-md lg:text-sm text-muted-foreground">
        {t("common.noCategoriesAvailable")}
      </div>
    );
  }

  return (
    <div className={cn("space-y-0.5", className)}>
      {roots.map((category) => (
        <CategoryNode
          key={category.path}
          category={category}
          level={0}
          childrenOf={childrenOf}
          expanded={expanded}
          onExpand={onExpand}
          selected={selected}
          recursive={recursive}
          onToggle={onToggle}
          countOf={countOf}
        />
      ))}
    </div>
  );
};
