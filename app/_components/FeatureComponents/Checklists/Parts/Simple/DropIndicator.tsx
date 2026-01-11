"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/app/_utils/global-utils";

interface DropIndicatorProps {
  id: string;
  data: Record<string, unknown>;
}

export const DropIndicator = ({ id, data }: DropIndicatorProps) => {
  const { setNodeRef, isOver } = useDroppable({ id, data });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "h-[2px] w-full transition-all",
        isOver ? "h-[4px] bg-primary" : "bg-transparent"
      )}
    />
  );
};
