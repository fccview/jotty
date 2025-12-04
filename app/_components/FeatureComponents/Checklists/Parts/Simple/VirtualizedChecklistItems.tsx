"use client";

import { useState, useEffect, useRef, memo } from "react";
import { NestedChecklistItem } from "@/app/_components/FeatureComponents/Checklists/Parts/Simple/NestedChecklistItem";
import { Item, Checklist } from "@/app/_types";
import { cn } from "@/app/_utils/global-utils";

interface VirtualizedChecklistItemsProps {
  items: Item[];
  onToggle: (itemId: string, completed: boolean) => void;
  onDelete: (itemId: string) => void;
  onEdit?: (itemId: string, text: string) => void;
  onAddSubItem?: (parentId: string, text: string) => void;
  isDeletingItem: boolean;
  checklist: Checklist;
  className?: string;
  isAnyItemDragging?: boolean;
  overItem?: { id: string; position: "before" | "after" } | null;
}

const VirtualizedChecklistItems = memo(
  ({
    items,
    onToggle,
    onDelete,
    onEdit,
    onAddSubItem,
    isDeletingItem,
    checklist,
    className,
    isAnyItemDragging = false,
    overItem,
  }: VirtualizedChecklistItemsProps) => {
    const [renderedCount, setRenderedCount] = useState(20);
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (items.length <= 50 || isAnyItemDragging) return;

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && renderedCount < items.length) {
            setRenderedCount((prev) => Math.min(prev + 20, items.length));
          }
        },
        { threshold: 0.1, rootMargin: "100px" }
      );

      if (sentinelRef.current) {
        observer.observe(sentinelRef.current);
      }

      return () => observer.disconnect();
    }, [items.length, renderedCount, isAnyItemDragging]);

    const visibleItems = items.slice(0, renderedCount);

    if (items.length === 0) {
      return null;
    }

    if (items.length <= 50) {
      return (
        <div className={cn("space-y-2", className)}>
          {items.map((item, index) => (
            <NestedChecklistItem
              key={item.id}
              item={item}
              index={index.toString()}
              level={0}
              onToggle={onToggle}
              onDelete={onDelete}
              onEdit={onEdit}
              onAddSubItem={onAddSubItem}
              isDeletingItem={isDeletingItem}
              isDragDisabled={false}
              checklist={checklist}
              isAnyItemDragging={isAnyItemDragging}
              isOver={overItem?.id === item.id}
              overPosition={overItem?.id === item.id ? overItem.position : undefined}
            />
          ))}
        </div>
      );
    }

    return (
      <div className={cn("space-y-2", className)}>
        {visibleItems.map((item, index) => (
          <NestedChecklistItem
            key={item.id}
            item={item}
            index={index.toString()}
            level={0}
            onToggle={onToggle}
            onDelete={onDelete}
            onEdit={onEdit}
            onAddSubItem={onAddSubItem}
            isDeletingItem={isDeletingItem}
            isDragDisabled={false}
            checklist={checklist}
            isAnyItemDragging={isAnyItemDragging}
            isOver={overItem?.id === item.id}
            overPosition={overItem?.id === item.id ? overItem.position : undefined}
          />
        ))}
        {renderedCount < items.length && (
          <div ref={sentinelRef} className="h-4" />
        )}
      </div>
    );
  }
);

VirtualizedChecklistItems.displayName = "VirtualizedChecklistItems";

export default VirtualizedChecklistItems;
