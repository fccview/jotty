"use client";

import {
  ChevronDown,
  ChevronRight,
  Folder,
  MoreHorizontal,
  FileText,
  CheckSquare,
  FolderPlus,
} from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { cn } from "@/app/_utils/global-utils";
import { DropdownMenu } from "@/app/_components/GlobalComponents/Dropdowns/DropdownMenu";
import { AppMode, Category, Checklist, Note } from "@/app/_types";
import { Draggable } from "@/app/_components/FeatureComponents/Sidebar/Parts/Draggable";
import { SidebarItem } from "@/app/_components/FeatureComponents/Sidebar/Parts/SidebarItem";
import { Modes } from "@/app/_types/enums";
import { DropIndicator } from "@/app/_components/FeatureComponents/Sidebar/Parts/DropIndicator";
import { Droppable } from "@/app/_components/FeatureComponents/Sidebar/Parts/Droppable";

interface CategoryRendererProps {
  category: Category;
  allCategories: Category[];
  allItems: (Checklist | Note)[];
  collapsedCategories: Set<string>;
  onToggleCategory: (categoryName: string) => void;
  onDeleteCategory: (categoryName: string) => void;
  onRenameCategory: (categoryName: string) => void;
  onQuickCreate: (categoryName: string) => void;
  onCreateSubcategory: (categoryPath: string) => void;
  onItemClick: (item: Checklist | Note) => void;
  onEditItem?: (item: Checklist | Note) => void;
  isItemSelected: (item: Checklist | Note) => boolean;
  mode: AppMode;
  user?: any;
}

export const CategoryRenderer = (props: CategoryRendererProps) => {
  const {
    category,
    allCategories,
    allItems,
    collapsedCategories,
    onToggleCategory,
    onDeleteCategory,
    onRenameCategory,
    onQuickCreate,
    onCreateSubcategory,
    onItemClick,
    onEditItem,
    isItemSelected,
    mode,
    user,
  } = props;

  const getItemsInCategory = (categoryPath: string) =>
    allItems.filter(
      (item) =>
        (item.category || "Uncategorized") === categoryPath && !item.isShared
    );
  const getSubCategories = (parentPath: string) =>
    allCategories.filter((cat) => cat.parent === parentPath);

  const getTotalItemsInCategory = (categoryPath: string): number => {
    const directItems = getItemsInCategory(categoryPath).length;
    const subCategories = getSubCategories(categoryPath);
    return (
      directItems +
      subCategories.reduce(
        (total, subCat) => total + getTotalItemsInCategory(subCat.path),
        0
      )
    );
  };

  const categoryItems = getItemsInCategory(category.path);
  const subCategories = getSubCategories(category.path);
  const isCollapsed = collapsedCategories.has(category.path);
  const hasContent = categoryItems.length > 0 || subCategories.length > 0;

  const dropdownItems = [
    {
      label: `New ${mode === Modes.CHECKLISTS ? "Checklist" : "Note"}`,
      onClick: () => onQuickCreate(category.path),
      icon:
        mode === Modes.CHECKLISTS ? (
          <CheckSquare className="h-4 w-4" />
        ) : (
          <FileText className="h-4 w-4" />
        ),
    },
    {
      label: "New Category",
      onClick: () => onCreateSubcategory(category.path),
      icon: <FolderPlus className="h-4 w-4" />,
    },
    { type: "divider" as const },
    {
      label: "Rename Category",
      onClick: () => onRenameCategory(category.path),
    },
    {
      label: "Delete Category",
      onClick: () => onDeleteCategory(category.path),
      variant: "destructive" as const,
    },
  ];

  const firstChild = subCategories[0] || categoryItems[0];
  const firstChildType = subCategories[0] ? "category" : "item";
  const firstChildId = subCategories[0]
    ? `category::${subCategories[0].path}`
    : categoryItems[0]
    ? `item::${categoryItems[0].category || "Uncategorized"}::${
        categoryItems[0].id
      }`
    : undefined;

  return (
    <div className="space-y-1">
      <Draggable
        id={`category::${category.path}`}
        data={{
          type: "category",
          categoryPath: category.path,
        }}
      >
        <Droppable
          id={`drop-into-category::${category.path}`}
          data={{
            type: "category",
            categoryPath: category.path,
          }}
          className="group"
        >
          {({ isOver }) => (
            <div
              className={cn(
                "flex items-center justify-between",
                isOver && "bg-primary/10 rounded-md"
              )}
            >
              <button
                onClick={() => onToggleCategory(category.path)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors w-full text-left",
                  hasContent
                    ? "hover:bg-muted/50 cursor-pointer"
                    : "text-muted-foreground cursor-default"
                )}
                style={{ paddingLeft: `${category.level * 16}px` }}
              >
                {hasContent ? (
                  isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )
                ) : (
                  <div className="w-4" />
                )}
                <Folder className="h-4 w-4" />
                <span className="truncate">{category.name}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {getTotalItemsInCategory(category.path)}
                </span>
              </button>

              <DropdownMenu
                align="right"
                items={dropdownItems}
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 opacity-40 lg:opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                }
              />
            </div>
          )}
        </Droppable>
      </Draggable>

      {!isCollapsed && (
        <div className="ml-2 border-l border-border/30 pl-2">
          <DropIndicator
            id={`drop-start::${category.path}`}
            data={{
              type: "drop-indicator",
              parentPath: category.path,
              position: "before",
              targetDndId: firstChildId,
              targetType: firstChildType,
            }}
          />

          {subCategories.map((subCat) => (
            <div key={subCat.path}>
              <CategoryRenderer {...props} category={subCat} />
              <DropIndicator
                id={`drop-after-category::${subCat.path}`}
                data={{
                  type: "drop-indicator",
                  parentPath: category.path,
                  position: "after",
                  targetDndId: `category::${subCat.path}`,
                  targetType: "category",
                }}
              />
            </div>
          ))}

          {categoryItems.map((item) => (
            <div key={`${category.path}-${item.id}`}>
              <Draggable
                id={`item::${item.category || "Uncategorized"}::${item.id}`}
                data={{
                  type: "item",
                  category: item.category || "Uncategorized",
                  id: item.id,
                }}
              >
                <SidebarItem
                  item={item}
                  mode={mode}
                  isSelected={isItemSelected(item)}
                  onItemClick={onItemClick}
                  onEditItem={onEditItem}
                  style={{ paddingLeft: `${category.level * 16}px` }}
                  user={user}
                />
              </Draggable>
              <DropIndicator
                id={`drop-after-item::${item.category || "Uncategorized"}::${
                  item.id
                }`}
                data={{
                  type: "drop-indicator",
                  parentPath: category.path,
                  position: "after",
                  targetDndId: `item::${item.category || "Uncategorized"}::${
                    item.id
                  }`,
                  targetType: "item",
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
