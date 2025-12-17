import { Category } from "@/app/_types";
import { cn } from "@/app/_utils/global-utils";
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  Folder01Icon,
  Folder02Icon,
} from "hugeicons-react";

export interface CategoryTreeNodeProps {
  category: Category;
  level: number;
  selectedCategory: string;
  expandedCategories: Set<string>;
  onCategoryClick: (categoryPath: string) => void;
  onToggleExpanded: (categoryPath: string) => void;
  getSubCategories: (parentPath: string) => Category[];
}

export const CategoryTreeNode = ({
  category,
  level,
  selectedCategory,
  expandedCategories,
  onCategoryClick,
  onToggleExpanded,
  getSubCategories,
}: CategoryTreeNodeProps) => {
  const subCategories = getSubCategories(category.path);
  const isExpanded = expandedCategories.has(category.path);
  const hasSubCategories = subCategories.length > 0;

  return (
    <div key={category.path} className="jotty-category-tree-node select-none">
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 text-sm rounded-jotty cursor-pointer hover:bg-muted/50",
          selectedCategory === category.path && "bg-primary/10 text-primary"
        )}
        style={{ paddingLeft: `${12 + level * 20}px` }}
        onClick={() => onCategoryClick(category.path)}
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
        <span className="truncate">{category.name}</span>
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
              selectedCategory={selectedCategory}
              expandedCategories={expandedCategories}
              onCategoryClick={onCategoryClick}
              onToggleExpanded={onToggleExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
};
