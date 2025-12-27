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

interface ChecklistGridItemProps {
  list: Checklist;
  onSelect: (list: Checklist) => void;
  isPinned?: boolean;
  onTogglePin?: (list: Checklist) => void;
  sharer?: string;
  isDraggable?: boolean;
}

export const ChecklistGridItem = ({
  list,
  onSelect,
  isPinned = false,
  onTogglePin,
  sharer,
  isDraggable = false,
}: ChecklistGridItemProps) => {
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
      className="group relative"
    >
      {onTogglePin && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(list);
          }}
          className={`absolute -top-1 -right-1 z-10 ${isPinned ? "opacity-100" : "opacity-0"
            } group-hover:opacity-100 transition-opacity p-1 bg-background rounded-full border border-border`}
        >
          {isPinned ? (
            <PinOffIcon className="h-3 w-3 text-muted-foreground" />
          ) : (
            <PinIcon className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
      )}

      <div
        className="flex flex-col items-center cursor-pointer p-2.5"
        onClick={() => onSelect(list)}
      >
        <div className="relative mb-2">
          {isTask ? (
            <TaskDaily01Icon className="h-16 w-16 text-primary !stroke-1" />
          ) : (
            <CheckmarkSquare04Icon className="h-16 w-16 text-primary !stroke-1" />
          )}
          <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-[10px] font-semibold">
            {completionRate}%
          </div>
        </div>

        <h3 className="font-medium text-sm text-center text-foreground line-clamp-2 w-full px-1">
          {displayTitle}
        </h3>

        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
          {sharer && <span className="truncate">{sharer}</span>}
          {!sharer && categoryName && <span className="truncate">{categoryName}</span>}
          {!sharer && !categoryName && (
            <span>{completedItems}/{totalItems}</span>
          )}
        </div>
      </div>
    </div>
  );
};
