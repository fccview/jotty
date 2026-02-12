"use client";

import { ReactNode, CSSProperties, useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface DraggableProps {
  id: string;
  data: Record<string, unknown>;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  disabled?: boolean;
}

export const Draggable = ({
  id,
  data,
  className,
  style,
  children,
  disabled,
}: DraggableProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id, data, disabled });

  const wasDragging = useRef(false);
  if (isDragging) wasDragging.current = true;

  const combinedStyle: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.6 : undefined,
    zIndex: isDragging ? 100 : undefined,
    ...style,
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClickCapture={(e) => {
        if (wasDragging.current) {
          e.stopPropagation();
          e.preventDefault();
          wasDragging.current = false;
        }
      }}
      className={className}
      style={combinedStyle}
    >
      {children}
    </div>
  );
};
