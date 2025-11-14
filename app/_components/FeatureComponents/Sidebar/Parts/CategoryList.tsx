"use client";

import { AppMode, Category, Checklist, Note, User } from "@/app/_types";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { moveNode } from "@/app/_server/actions/category";
import { CategoryRenderer } from "@/app/_components/FeatureComponents/Sidebar/Parts/CategoryRenderer";
import { DropIndicator } from "@/app/_components/FeatureComponents/Sidebar/Parts/DropIndicator";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { buildCategoryPath, encodeCategoryPath } from "@/app/_utils/global-utils";
import { Modes } from "@/app/_types/enums";

interface CategoryListProps {
  categories: Category[];
  items: (Checklist | Note)[];
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
  user?: User;
}

export const CategoryList = (props: CategoryListProps) => {
  const { categories, mode } = props;
  const [overTimeout, setOverTimeout] = useState<NodeJS.Timeout | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  if (!categories || categories.length === 0) {
    return null;
  }

  const rootCategories = categories.filter((cat) => !cat.parent);

  const clearOverTimeout = () => {
    if (overTimeout) {
      clearTimeout(overTimeout);
      setOverTimeout(null);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    const newOverId = over ? String(over.id) : null;

    clearOverTimeout();

    if (!newOverId) return;

    const overNode = over?.data.current;
    if (
      overNode &&
      (overNode.type === "category" ||
        over?.id === `drop-into-category::${overNode.categoryPath}`) &&
      overNode.categoryPath
    ) {
      const isCollapsed = props.collapsedCategories.has(overNode.categoryPath);
      if (isCollapsed) {
        const timeout = setTimeout(() => {
          props.onToggleCategory(overNode.categoryPath);
        }, 1000);
        setOverTimeout(timeout);
      }
    }
  };

  const handleDragCancel = () => {
    clearOverTimeout();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    clearOverTimeout();
    const { active, over } = event;
    if (!over || !active || active.id === over.id) {
      return;
    }

    const activeNode = active.data.current;
    const overNode = over?.data.current;

    if (!activeNode || !overNode) {
      return;
    }

    let currentItemPath: string | null = null;
    if (activeNode.type === "item") {
      const routePrefix = mode === Modes.CHECKLISTS ? "/checklist" : "/note";
      const currentCategoryPath = buildCategoryPath(
        activeNode.category,
        activeNode.id
      );
      currentItemPath = `${routePrefix}/${currentCategoryPath}`;
    }

    const formData = new FormData();
    formData.append("mode", mode);

    formData.append("activeType", activeNode.type);
    if (activeNode.type === "item") {
      formData.append("activeId", activeNode.id);
      formData.append("activeItemCategory", activeNode.category);
    } else {
      formData.append("activeCategoryPath", activeNode.categoryPath);
    }

    formData.append("overType", overNode.type);
    formData.append("overDndId", over.id as string);

    if (overNode.type === "drop-indicator") {
      formData.append("targetParentPath", overNode.parentPath || "");
      formData.append("targetPosition", overNode.position);
      formData.append("targetDndId", overNode.targetDndId || "");
      formData.append("targetType", overNode.targetType || "");
    } else if (overNode.type === "category") {
      formData.append("targetCategoryPath", overNode.categoryPath);
    }

    const result = await moveNode(formData);

    if (
      activeNode.type === "item" &&
      currentItemPath &&
      pathname === currentItemPath
    ) {
      let newCategory = "";
      if (overNode.type === "category") {
        newCategory = overNode.categoryPath;
      } else if (overNode.type === "drop-indicator") {
        newCategory = overNode.parentPath || "Uncategorized";
      }

      if (newCategory === "") {
        newCategory = "Uncategorized";
      }

      const routePrefix = mode === Modes.CHECKLISTS ? "/checklist" : "/note";
      const newItemPath = `${routePrefix}/${buildCategoryPath(
        newCategory,
        activeNode.id
      )}`;

      router.push(newItemPath);
    } else if (activeNode.type === "category" && pathname) {
      const routePrefix = mode === Modes.CHECKLISTS ? "/checklist" : "/note";
      const oldCategoryPath = activeNode.categoryPath;
      const categoryName = activeNode.categoryPath.split("/").pop() || "";

      let newCategoryPath = "";
      if (overNode.type === "category") {
        newCategoryPath = `${overNode.categoryPath}/${categoryName}`;
      } else if (overNode.type === "drop-indicator") {
        const parentPath = overNode.parentPath || "";
        newCategoryPath =
          parentPath === "" ? categoryName : `${parentPath}/${categoryName}`;
      }

      const oldCategoryUrl = `${routePrefix}/${encodeCategoryPath(oldCategoryPath)}/`;
      const pathnameParts = pathname.split("/");

      let itemPart = "";
      let matched = false;

      if (pathname.startsWith(oldCategoryUrl) && pathnameParts.length > 3) {
        const categoryPathParts = encodeCategoryPath(oldCategoryPath).split("/");
        const startIndex = routePrefix.split("/").length + categoryPathParts.length;
        itemPart = pathnameParts.slice(startIndex).join("/");
        matched = true;
      }

      if (matched) {
        const newPath = `${routePrefix}/${buildCategoryPath(
          newCategoryPath,
          decodeURIComponent(itemPart)
        )}`;
        router.push(newPath);
      } else {
        router.refresh();
      }
    } else {
      router.refresh();
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragCancel={handleDragCancel}
    >
      <div className="space-y-1">
        <DropIndicator
          id="drop-root-start"
          data={{
            type: "drop-indicator",
            parentPath: null,
            position: "before",
            targetDndId: rootCategories[0]?.path
              ? `category::${rootCategories[0].path}`
              : undefined,
            targetType: "category",
          }}
        />
        {rootCategories.map((category) => (
          <div key={category.path}>
            <CategoryRenderer
              category={category}
              allCategories={categories}
              allItems={props.items}
              {...props}
            />
            <DropIndicator
              id={`drop-after-root::${category.path}`}
              data={{
                type: "drop-indicator",
                parentPath: null,
                position: "after",
                targetDndId: `category::${category.path}`,
                targetType: "category",
              }}
            />
          </div>
        ))}
      </div>
    </DndContext>
  );
};
