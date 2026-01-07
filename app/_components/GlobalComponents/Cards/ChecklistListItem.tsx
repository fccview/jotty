"use client";

import {
  CheckmarkSquare04Icon,
  TaskDaily01Icon,
  PinIcon,
  PinOffIcon,
} from "hugeicons-react";
import { Checklist } from "@/app/_types";
import { isItemCompleted } from "@/app/_utils/checklist-utils";
import { parseChecklistContent } from "@/app/_utils/client-parser-utils";
import { useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ChecklistListItemProps {
  list: Checklist;
  onSelect: (list: Checklist) => void;
  isPinned?: boolean;
  onTogglePin?: (list: Checklist) => void;
  sharer?: string;
  isDraggable?: boolean;
}

export const ChecklistListItem = ({
  list,
  onSelect,
  isPinned = false,
  onTogglePin,
  sharer,
  isDraggable = false,
}: ChecklistListItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list?.uuid || list.id,
    disabled: !isDraggable,
  });

  const parsedData = useMemo(() => {
    if ("rawContent" in list) {
      return parseChecklistContent((list as any).rawContent, list.id);
    }
    return null;
  }, [list]);

  const displayTitle = parsedData?.title || list.title;
  const displayItems = parsedData?.items || list.items;

  const activeItems = displayItems?.filter((item) => !item.isArchived);

  const totalItems = activeItems?.length || 0;
  const completedItems = activeItems?.filter((item) =>
    isItemCompleted(item, list.type)
  ).length;
  const completionRate =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const categoryName = useMemo(() => {
    return list?.category ? list?.category.split("/").pop() : null;
  }, [list?.category]);

  const isTask = list.type === "task";

  const style = isDragging
    ? { opacity: 0.4 }
    : {
      transform: CSS.Transform.toString(transform),
      transition,
    };

  const itemStyle = {
    ...style,
    ...(isDraggable && !isDragging ? { cursor: "grab" } : {}),
  };

  return (
    <div
      ref={setNodeRef}
      style={itemStyle}
      {...(isDraggable ? { ...attributes, ...listeners } : {})}
      className="bg-card border border-border rounded-jotty group hover:border-primary transition-colors"
    >
      <div className="p-3 flex items-center gap-3">
        <div className="flex-shrink-0">
          {isTask ? (
            <TaskDaily01Icon className="h-5 w-5 text-primary" />
          ) : (
            <CheckmarkSquare04Icon className="h-5 w-5 text-primary" />
          )}
        </div>

        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onSelect(list)}
        >
          <h3 className="font-medium text-md lg:text-sm text-foreground truncate mb-1">
            {displayTitle}
          </h3>
          <div className="flex items-center gap-2 text-sm lg:text-xs text-muted-foreground">
            {categoryName && (
              <span className="truncate">{categoryName}</span>
            )}
            {categoryName && <span>•</span>}
            <span>{completedItems}/{totalItems} items</span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 text-primary px-2 py-1 rounded-jotty text-sm lg:text-xs font-medium">
              {completionRate}%
            </div>
          </div>

          {onTogglePin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(list);
              }}
              className={`${isPinned ? "opacity-100" : "opacity-0"
                } group-hover:opacity-100 transition-opacity p-1.5 rounded-jotty flex-shrink-0`}
            >
              {isPinned ? (
                <PinOffIcon className="h-4 w-4 text-muted-foreground" />
              ) : (
                <PinIcon className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
