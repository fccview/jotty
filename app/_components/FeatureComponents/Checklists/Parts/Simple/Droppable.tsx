"use client";

import { useDroppable } from "@dnd-kit/core";
import { ReactNode } from "react";

interface DroppableProps {
  id: string;
  data: Record<string, unknown>;
  children: ReactNode | ((props: { isOver: boolean }) => ReactNode);
  className?: string;
}

export const Droppable = ({
  id,
  data,
  children,
  className,
}: DroppableProps) => {
  const { setNodeRef, isOver } = useDroppable({ id, data });

  return (
    <div ref={setNodeRef} className={className}>
      {typeof children === "function" ? children({ isOver }) : children}
    </div>
  );
};
