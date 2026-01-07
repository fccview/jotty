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
    <div className="relative h-1 w-full">
      <div
        ref={setNodeRef}
        className="absolute -top-1 left-0 right-0 h-[16px] flex items-center pointer-events-auto"
      >
        <div
          className={cn(
            "h-[2px] w-full transition-all",
            isOver ? "bg-primary rounded-full" : "bg-transparent"
          )}
        />
      </div>
    </div>
  );
};
