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
        "w-full transition-all flex items-center justify-center",
        isOver ? "h-[12px]" : "h-0"
      )}
    >
      {isOver && <div className="h-[4px] w-full bg-primary rounded-full" />}
    </div>
  );
};
