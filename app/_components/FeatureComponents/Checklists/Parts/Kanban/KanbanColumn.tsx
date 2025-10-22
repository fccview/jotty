"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Item } from "@/app/_types";
import { KanbanItem } from "./KanbanItem";
import { cn } from "@/app/_utils/global-utils";
import { TaskStatus } from "@/app/_types/enums";

interface KanbanColumnProps {
  id: string;
  title: string;
  items: Item[];
  status: TaskStatus;
  checklistId: string;
  category: string;
  onUpdate?: () => void;
}

export const KanbanColumn = ({
  id,
  title,
  items,
  status,
  checklistId,
  category,
  onUpdate,
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  const getColumnColor = (status: string) => {
    switch (status) {
      case TaskStatus.TODO:
        return "border-border bg-muted/30";
      case TaskStatus.IN_PROGRESS:
        return "border-primary/30 bg-primary/5";
      case TaskStatus.COMPLETED:
        return "border-green-500/30 bg-green-500/5";
      case TaskStatus.PAUSED:
        return "border-yellow-500/30 bg-yellow-500/5";
      default:
        return "border-border bg-muted/30";
    }
  };

  const getColumnTextColor = (status: string) => {
    switch (status) {
      case TaskStatus.TODO:
        return "text-muted-foreground";
      case TaskStatus.IN_PROGRESS:
        return "text-primary";
      case TaskStatus.COMPLETED:
        return "text-green-600 dark:text-green-400";
      case TaskStatus.PAUSED:
        return "text-yellow-600 dark:text-yellow-400";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-medium text-sm ${getColumnTextColor(status)}`}>
          {title}
        </h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
          {items.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 rounded-lg border-2 border-dashed p-3 min-h-[200px] transition-colors",
          getColumnColor(status),
          isOver && "border-primary bg-primary/5"
        )}
      >
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {items.map((item) => (
              <KanbanItem
                key={item.id}
                item={item}
                checklistId={checklistId}
                category={category}
                onUpdate={onUpdate}
              />
            ))}
            {items.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                No tasks
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
};
