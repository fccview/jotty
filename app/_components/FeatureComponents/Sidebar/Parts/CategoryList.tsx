"use client";

import {
  AppMode,
  Category,
  Checklist,
  FolderStats,
  Note,
  SanitisedUser,
  SidebarRow,
  SidebarSnapshot,
} from "@/app/_types";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { moveNode } from "@/app/_server/actions/category";
import { Draggable } from "@/app/_components/FeatureComponents/Sidebar/Parts/Draggable";
import { DropIndicator } from "@/app/_components/FeatureComponents/Sidebar/Parts/DropIndicator";
import { FolderActions, FolderRow } from "@/app/_components/FeatureComponents/Sidebar/Parts/FolderRow";
import { RowFrame, SidebarTree } from "@/app/_components/FeatureComponents/Sidebar/Parts/SidebarTree";
import { SidebarItem } from "@/app/_components/FeatureComponents/Sidebar/Parts/SidebarItem";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/app/_providers/ToastProvider";
import { useTranslations } from "next-intl";
import { SIDEBAR_ITEM_HEIGHT, SidebarRowKinds } from "@/app/_consts/sidebar";
import { childrenOf, flattenSidebar } from "@/app/_utils/sidebar-tree-utils";
import { RowWant, useSidebarRows } from "@/app/_hooks/useSidebarRows";

const NO_STATS: Record<string, FolderStats> = {};

interface CategoryListProps extends FolderActions {
  categories: Category[];
  snapshot?: SidebarSnapshot;
  collapsedCategories: Set<string>;
  onClose?: () => void;
  onEditItem?: (item: Checklist | Note) => void;
  isItemSelected: (item: Checklist | Note) => boolean;
  mode: AppMode;
  modeSettled: boolean;
  user?: SanitisedUser;
  scrollElement: HTMLElement | null;
}

const ItemPlaceholder = ({ level }: { level: number }) => (
  <div className="flex items-center px-3" style={{ paddingLeft: `${level * 16}px`, height: SIDEBAR_ITEM_HEIGHT }}>
    <div className="h-3 w-2/3 rounded-jotty bg-muted/50 animate-pulse" />
  </div>
);

export const CategoryList = (props: CategoryListProps) => {
  const { categories, mode, snapshot, collapsedCategories, scrollElement } = props;
  const [overTimeout, setOverTimeout] = useState<NodeJS.Timeout | null>(null);
  const [draggedRow, setDraggedRow] = useState<number | null>(null);
  const router = useRouter();
  const { showToast } = useToast();
  const t = useTranslations();

  const stats = snapshot?.folders || NO_STATS;
  const { entryAt, ensure } = useSidebarRows(mode, snapshot);
  const subfolders = useMemo(() => childrenOf(categories), [categories]);
  const rows = useMemo(
    () => flattenSidebar(categories, collapsedCategories, stats),
    [categories, collapsedCategories, stats],
  );

  const onVisible = useCallback(
    (first: number, last: number) => {
      const wants: RowWant[] = [];
      rows.slice(first, last + 1).forEach((row) => {
        if (row.kind === SidebarRowKinds.ITEM) {
          wants.push({ category: row.category.path, index: row.index });
        } else if (row.kind === SidebarRowKinds.FOLDER_START && (stats[row.category.path]?.direct || 0) > 0) {
          wants.push({ category: row.category.path, index: 0 });
        }
      });
      ensure(wants);
    },
    [rows, stats, ensure],
  );

  const mountRootFor = (categoryPath: string) =>
    categories.find(
      (category) =>
        category.path === categoryPath &&
        category.level === 0 &&
        Boolean(category.sharedFrom),
    );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor),
  );

  if (!categories || categories.length === 0) {
    return null;
  }

  const clearOverTimeout = () => {
    if (overTimeout) {
      clearTimeout(overTimeout);
      setOverTimeout(null);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const rowIndex = event.active.data.current?.rowIndex;
    setDraggedRow(typeof rowIndex === "number" ? rowIndex : null);
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
      const isCollapsed = collapsedCategories.has(overNode.categoryPath);
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
    setDraggedRow(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    clearOverTimeout();
    setDraggedRow(null);
    const { active, over } = event;
    if (!over || !active || active.id === over.id) {
      return;
    }

    const activeNode = active.data.current;
    const overNode = over?.data.current;

    if (!activeNode || !overNode) {
      return;
    }

    const nestsAMount =
      activeNode.type === "category" &&
      Boolean(mountRootFor(activeNode.categoryPath)) &&
      (overNode.type === "category" ||
        Boolean(overNode.parentPath));

    if (nestsAMount) {
      showToast({
        type: "error",
        title: t("common.error"),
        message: t("sharing.mountStaysTop"),
      });
      return;
    }

    const formData = new FormData();
    formData.append("mode", mode);

    formData.append("activeType", activeNode.type);
    if (activeNode.type === "item") {
      formData.append("activeUuid", activeNode.uuid);
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

    if (result?.error) {
      showToast({
        type: "error",
        title: t("common.error"),
        message: result.error,
      });
      return;
    }

    router.refresh();
  };

  const renderContent = (row: SidebarRow, index: number) => {
    switch (row.kind) {
      case SidebarRowKinds.ROOT_START:
        return (
          <DropIndicator
            id="drop-root-start"
            data={{
              type: "drop-indicator",
              parentPath: null,
              position: "before",
              targetDndId: row.firstRoot ? `category::${row.firstRoot}` : undefined,
              targetType: "category",
            }}
          />
        );
      case SidebarRowKinds.FOLDER:
        return (
          <FolderRow
            category={row.category}
            stats={stats[row.category.path]}
            hasSubfolders={(subfolders.get(row.category.path)?.length || 0) > 0}
            isCollapsed={collapsedCategories.has(row.category.path)}
            mode={mode}
            rowIndex={index}
            onToggleCategory={props.onToggleCategory}
            onCategorySelect={props.onCategorySelect}
            onDeleteCategory={props.onDeleteCategory}
            onRenameCategory={props.onRenameCategory}
            onQuickCreate={props.onQuickCreate}
            onCreateSubcategory={props.onCreateSubcategory}
            onShareCategory={props.onShareCategory}
          />
        );
      case SidebarRowKinds.FOLDER_START: {
        const firstItem = row.firstChild ? undefined : entryAt(row.category.path, 0);
        return (
          <DropIndicator
            id={`drop-start::${row.category.path}`}
            data={{
              type: "drop-indicator",
              parentPath: row.category.path,
              position: "before",
              targetDndId: row.firstChild ?? (firstItem ? `item::${firstItem.uuid}` : undefined),
              targetType: row.firstChild ? "category" : "item",
            }}
          />
        );
      }
      case SidebarRowKinds.FOLDER_END:
        return (
          <DropIndicator
            id={`${row.isRoot ? "drop-after-root" : "drop-after-category"}::${row.category.path}`}
            data={{
              type: "drop-indicator",
              parentPath: row.isRoot ? null : row.category.parent,
              position: "after",
              targetDndId: `category::${row.category.path}`,
              targetType: "category",
            }}
          />
        );
      case SidebarRowKinds.ITEM: {
        const item = entryAt(row.category.path, row.index);
        if (!item) return <ItemPlaceholder level={row.category.level} />;
        return (
          <div>
            <Draggable
              id={`item::${item.uuid}`}
              data={{
                type: "item",
                uuid: item.uuid,
                rowIndex: index,
              }}
            >
              <SidebarItem
                item={item}
                mode={mode}
                isSelected={props.isItemSelected(item)}
                onClose={props.onClose}
                onEditItem={props.onEditItem}
                style={{ paddingLeft: `${row.category.level * 16}px` }}
                user={props.user}
              />
            </Draggable>
            <DropIndicator
              id={`drop-after-item::${item.uuid}`}
              data={{
                type: "drop-indicator",
                parentPath: row.category.path,
                position: "after",
                targetDndId: `item::${item.uuid}`,
                targetType: "item",
              }}
            />
          </div>
        );
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragCancel={handleDragCancel}
    >
      <SidebarTree
        mode={props.modeSettled ? mode : null}
        rows={rows}
        scrollElement={scrollElement}
        onVisible={onVisible}
        pinnedIndex={draggedRow}
        renderRow={(row, index) => <RowFrame row={row}>{renderContent(row, index)}</RowFrame>}
      />
    </DndContext>
  );
};
