"use client";

import { useMemo, memo } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Item, Checklist, KanbanStatus } from "@/app/_types";
import { KanbanItem } from "./KanbanItem";
import { cn } from "@/app/_utils/global-utils";
import { TaskStatus } from "@/app/_types/enums";
import { useTranslations } from "next-intl";

interface KanbanColumnProps {
  checklist: Checklist;
  id: string;
  title: string;
  items: Item[];
  status: string;
  checklistId: string;
  category: string;
  onUpdate: (updatedChecklist: Checklist) => void;
  isShared: boolean;
  statusColor?: string;
  statuses: KanbanStatus[];
}

const KanbanColumnComponent = ({
  checklist,
  id,
  title,
  items,
  status,
  checklistId,
  category,
  isShared,
  onUpdate,
  statusColor,
  statuses,
}: KanbanColumnProps) => {
  const t = useTranslations();
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  const defaultColors: Record<string, string> = useMemo(
    () => ({
      [TaskStatus.TODO]: "#6b7280",
      [TaskStatus.IN_PROGRESS]: "#3b82f6",
      [TaskStatus.COMPLETED]: "#10b981",
      [TaskStatus.PAUSED]: "#f59e0b",
    }),
    []
  );

  const color = statusColor || defaultColors[status] || "#6b7280";

  const { borderColor, bgColor } = useMemo(() => {
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
        : null;
    };

    const rgb = hexToRgb(color);
    return {
      borderColor: rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)` : color,
      bgColor: rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05)` : color,
    };
  }, [color]);

  return (
    <div className="flex flex-col h-full my-4 lg:my-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <h3 className="font-medium text-sm text-foreground">{title}</h3>
        </div>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
          {items.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 rounded-jotty border-2 border-dashed p-3 min-h-[200px] transition-colors",
          isOver && "border-primary bg-primary/5"
        )}
        style={{
          borderColor: isOver ? undefined : borderColor,
          backgroundColor: isOver ? undefined : bgColor,
        }}
      >
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {items.map((item) => (
              <KanbanItem
                checklist={checklist}
                key={item.id}
                item={item}
                checklistId={checklistId}
                category={category}
                onUpdate={onUpdate}
                isShared={isShared}
                statuses={statuses}
              />
            ))}
            {items.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                {t('checklists.noTasks')}
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
};

export const KanbanColumn = memo(KanbanColumnComponent);
