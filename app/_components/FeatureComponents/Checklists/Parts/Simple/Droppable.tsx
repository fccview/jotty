"use client";

import { useDroppable } from "@dnd-kit/core";
import { ReactNode, useEffect, useState } from "react";

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
  const [showDropIntoIndicator, setShowDropIntoIndicator] = useState(false);

  const { setNodeRef, isOver, active } = useDroppable({
    id,
    data: {
      ...data,
      allowDropInto: showDropIntoIndicator,
    },
  });

  useEffect(() => {
    if (!isOver || !active) {
      setShowDropIntoIndicator(false);
      return;
    }

    const hoverTimeout = setTimeout(() => {
      setShowDropIntoIndicator(true);
    }, 600);

    return () => {
      clearTimeout(hoverTimeout);
    };
  }, [isOver, active]);

  return (
    <div ref={setNodeRef} className={className}>
      {typeof children === "function"
        ? children({ isOver: isOver && showDropIntoIndicator })
        : children}
    </div>
  );
};
