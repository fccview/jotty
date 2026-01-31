"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useNotesStore } from "@/app/_utils/notes-store";

interface VisualGuideRulerProps {
  charWidth: number;
  showLineNumbers?: boolean;
}

export const VisualGuideRuler = ({
  charWidth,
  showLineNumbers = true,
}: VisualGuideRulerProps) => {
  const rulerRef = useRef<HTMLDivElement>(null);
  const { visualGuideColumns, addVisualGuideColumn, removeVisualGuideColumn, showVisualGuides, setShowVisualGuides } = useNotesStore();
  const [isDragging, setIsDragging] = useState(false);
  const [dragColumn, setDragColumn] = useState<number | null>(null);
  const [hoverColumn, setHoverColumn] = useState<number | null>(null);

  const lineNumbersWidth = showLineNumbers ? 40 : 0;
  const editorPadding = 16;

  const getColumnFromX = useCallback((clientX: number): number => {
    if (!rulerRef.current || charWidth <= 0) return 0;
    const rect = rulerRef.current.getBoundingClientRect();
    const x = clientX - rect.left - lineNumbersWidth - editorPadding;
    return Math.max(1, Math.round(x / charWidth));
  }, [charWidth, lineNumbersWidth]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (charWidth <= 0) return;
    const column = getColumnFromX(e.clientX);
    if (column > 0) {
      setIsDragging(true);
      setDragColumn(column);
      if (!showVisualGuides) {
        setShowVisualGuides(true);
      }
    }
  }, [charWidth, getColumnFromX, showVisualGuides, setShowVisualGuides]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const column = getColumnFromX(e.clientX);
    if (column > 0) {
      setDragColumn(column);
    }
  }, [isDragging, getColumnFromX]);

  const handleMouseUp = useCallback(() => {
    if (isDragging && dragColumn !== null && dragColumn > 0) {
      addVisualGuideColumn(dragColumn);
    }
    setIsDragging(false);
    setDragColumn(null);
  }, [isDragging, dragColumn, addVisualGuideColumn]);

  const handleRulerMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) {
      const column = getColumnFromX(e.clientX);
      setHoverColumn(column > 0 ? column : null);
    }
  }, [isDragging, getColumnFromX]);

  const handleRulerMouseLeave = useCallback(() => {
    if (!isDragging) {
      setHoverColumn(null);
    }
  }, [isDragging]);

  const handleGuideClick = useCallback((column: number, e: React.MouseEvent) => {
    e.stopPropagation();
    removeVisualGuideColumn(column);
  }, [removeVisualGuideColumn]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (charWidth <= 0) return null;

  const majorTickInterval = 10;
  const minorTickInterval = 5;
  const maxColumns = 200;

  return (
    <div
      ref={rulerRef}
      className="h-6 bg-muted/50 border-b border-border relative select-none cursor-crosshair hidden lg:block overflow-hidden"
      style={{ paddingLeft: lineNumbersWidth }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleRulerMouseMove}
      onMouseLeave={handleRulerMouseLeave}
    >
      <div className="relative h-full" style={{ marginLeft: editorPadding }}>
        {Array.from({ length: maxColumns }, (_, i) => i + 1).map((col) => {
          const isMajor = col % majorTickInterval === 0;
          const isMinor = col % minorTickInterval === 0 && !isMajor;
          const left = col * charWidth;

          if (!isMajor && !isMinor) return null;

          return (
            <div
              key={col}
              className="absolute top-0 flex flex-col items-center"
              style={{ left: `${left}px`, transform: "translateX(-50%)" }}
            >
              {isMajor && (
                <span className="text-[9px] text-muted-foreground leading-none">
                  {col}
                </span>
              )}
              <div
                className={`w-px ${isMajor ? "h-2 bg-muted-foreground/60" : "h-1 bg-muted-foreground/30"}`}
                style={{ marginTop: isMajor ? "2px" : "auto" }}
              />
            </div>
          );
        })}

        {visualGuideColumns.map((col) => (
          <div
            key={`guide-${col}`}
            className="absolute top-0 bottom-0 w-1 bg-primary/60 cursor-pointer hover:bg-destructive/80 transition-colors"
            style={{ left: `${col * charWidth}px`, transform: "translateX(-50%)" }}
            onClick={(e) => handleGuideClick(col, e)}
            title={`Column ${col} (click to remove)`}
          />
        ))}

        {isDragging && dragColumn !== null && (
          <div
            className="absolute top-0 bottom-0 w-1 bg-primary/80 pointer-events-none"
            style={{ left: `${dragColumn * charWidth}px`, transform: "translateX(-50%)" }}
          />
        )}

        {!isDragging && hoverColumn !== null && !visualGuideColumns.includes(hoverColumn) && (
          <div
            className="absolute top-0 bottom-0 w-px bg-primary/40 pointer-events-none"
            style={{ left: `${hoverColumn * charWidth}px`, transform: "translateX(-50%)" }}
          />
        )}
      </div>

      {(isDragging || hoverColumn) && (
        <div className="absolute top-0 right-2 text-[10px] text-muted-foreground bg-background/80 px-1 rounded">
          {isDragging ? dragColumn : hoverColumn}
        </div>
      )}
    </div>
  );
};
