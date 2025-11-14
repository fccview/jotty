"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/app/_utils/global-utils";

interface ChecklistDropIndicatorProps {
    id: string;
    data: Record<string, unknown>;
}

export const ChecklistDropIndicator = ({ id, data }: ChecklistDropIndicatorProps) => {
    const { setNodeRef, isOver, active } = useDroppable({ id, data });

    const activeData = active?.data.current;
    const isValidDrop = activeData?.type === "item" &&
        ((data.parentPath === "todo" && !activeData.completed) ||
            (data.parentPath === "completed" && activeData.completed));

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "h-[2px] w-full transition-all",
                (isOver && isValidDrop) ? "bg-primary" : "bg-transparent"
            )}
        />
    );
};
