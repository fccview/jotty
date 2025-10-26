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
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Draggable } from "./Draggable";
import {
  setCategoryOrder,
  setChecklistOrderInCategory,
} from "@/app/_server/actions/category";
import { SidebarItem } from "./SidebarItem";
import { Modes } from "@/app/_types/enums";

interface SharingStatus {
  isShared: boolean;
  isPubliclyShared: boolean;
  sharedWith: string[];
}

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
  getSharingStatus: (itemId: string) => SharingStatus | null;
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
    getSharingStatus,
    user,
  } = props;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

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

  const handleDragEnd = async (
    event: DragEndEvent,
    type: "category" | "item"
  ) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const formData = new FormData();
    formData.append("mode", mode);

    if (type === "category") {
      const ids = subCategories.map((c) => c.name);
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;
      const newOrder = arrayMove(ids, oldIndex, newIndex);
      formData.append("parent", category.path);
      formData.append("categories", JSON.stringify(newOrder));
      await setCategoryOrder(formData);
    } else {
      const ids = categoryItems.map((i) => i.id);
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;
      const newOrder = arrayMove(ids, oldIndex, newIndex);
      formData.append("category", category.path);
      formData.append("items", JSON.stringify(newOrder));
      await setChecklistOrderInCategory(formData);
    }
  };

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

  return (
    <div className="space-y-1 overflow-hidden">
      <div className="flex items-center justify-between group">
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

      {!isCollapsed && (
        <>
          {subCategories.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => handleDragEnd(e, "category")}
            >
              <SortableContext
                items={subCategories.map((c) => c.name)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1 ml-2 border-l border-border/30 pl-2">
                  {subCategories.map((subCat) => (
                    <Draggable
                      key={subCat.name}
                      id={subCat.name}
                      data={{ type: "category", parent: category.path }}
                    >
                      <CategoryRenderer {...props} category={subCat} />
                    </Draggable>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
          {categoryItems.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => handleDragEnd(e, "item")}
            >
              <SortableContext
                items={categoryItems.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-0.5 ml-2 border-l border-border/30 pl-2">
                  {categoryItems.map((item) => (
                    <Draggable
                      key={`${category.path}-${item.id}`}
                      id={item.id}
                      data={{ type: "item", category: category.path }}
                    >
                      <SidebarItem
                        item={item}
                        mode={mode}
                        isSelected={isItemSelected(item)}
                        onItemClick={onItemClick}
                        onEditItem={onEditItem}
                        sharingStatus={getSharingStatus(item.id)}
                        style={{ paddingLeft: `${category.level * 16}px` }}
                        user={user}
                      />
                    </Draggable>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </>
      )}
    </div>
  );
};
