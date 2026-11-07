"use client";

import { CSSProperties, ReactNode } from "react";
import {
  DEFAULT_KANBAN_COLUMN_WIDTH,
  KANBAN_GRID_MAX_COLUMNS,
  MIN_KANBAN_COLUMN_WIDTH,
} from "@/app/_consts/styling";

interface KanbanGridProps<T extends { id: string }> {
  columns: T[];
  columnWidth?: number | null;
  renderColumn: (column: T) => ReactNode;
}

export const KanbanGrid = <T extends { id: string }>({
  columns,
  columnWidth = null,
  renderColumn,
}: KanbanGridProps<T>) => {
  const count = columns.length;
  const fitsGrid = count <= KANBAN_GRID_MAX_COLUMNS;
  const gridStyle = {
    "--kanban-col-count": count,
    "--kanban-col-min": `${MIN_KANBAN_COLUMN_WIDTH}px`,
    ...(columnWidth !== null && { gridTemplateColumns: `repeat(${count}, ${columnWidth}px)` }),
  } as CSSProperties;

  return (
    <div
      className={
        fitsGrid ? "min-h-full min-w-0 kanban-grid gap-4 p-2 sm:p-4" : "min-h-0 min-w-0 flex gap-4 p-2 sm:p-4"
      }
      style={fitsGrid ? gridStyle : undefined}
    >
      {columns.map((column) => (
        <div
          key={column.id}
          className={fitsGrid ? "min-w-0" : "flex-shrink-0"}
          style={fitsGrid ? undefined : { width: `${columnWidth ?? DEFAULT_KANBAN_COLUMN_WIDTH}px` }}
        >
          {renderColumn(column)}
        </div>
      ))}
    </div>
  );
};
