"use client";

import { useDroppable } from "@dnd-kit/core";
import { ReactNode, useEffect, useRef, useState } from "react";

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
  const { setNodeRef, isOver, active } = useDroppable({
    id,
    data,
  });
  const elementRef = useRef<HTMLDivElement>(null);
  const [isValidDropZone, setIsValidDropZone] = useState(false);

  useEffect(() => {
    if (!isOver || !active || !elementRef.current) {
      setIsValidDropZone(false);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!elementRef.current) return;

      const rect = elementRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const widthThreshold = rect.width * 0.07;

      setIsValidDropZone(relativeX > widthThreshold);
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [isOver, active]);

  const combinedRef = (node: HTMLDivElement | null) => {
    (elementRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    setNodeRef(node);
  };

  return (
    <div ref={combinedRef} className={className}>
      {typeof children === "function" ? children({ isOver: isOver && isValidDropZone }) : children}
    </div>
  );
};
