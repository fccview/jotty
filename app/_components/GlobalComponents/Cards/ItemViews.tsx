"use client";

import { ReactNode } from "react";
import Masonry from "react-masonry-css";
import { ViewMode } from "@/app/_consts/view-modes";

const GAPS = {
  tight: { wrap: "-ml-4", column: "pl-4", item: "mb-4" },
  loose: { wrap: "-ml-6", column: "pl-6", item: "mb-6" },
};

interface ItemViewsProps<T> {
  items: T[];
  view: ViewMode;
  keyOf: (item: T) => string;
  columns: Record<string, number>;
  gap?: keyof typeof GAPS;
  renderCard: (item: T) => ReactNode;
  renderRow: (item: T) => ReactNode;
  renderTile: (item: T) => ReactNode;
}

export const ItemViews = <T,>({
  items,
  view,
  keyOf,
  columns,
  gap = "loose",
  renderCard,
  renderRow,
  renderTile,
}: ItemViewsProps<T>) => {
  if (view === ViewMode.LIST) {
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <div key={keyOf(item)}>{renderRow(item)}</div>
        ))}
      </div>
    );
  }

  if (view === ViewMode.GRID) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {items.map((item) => (
          <div key={keyOf(item)}>{renderTile(item)}</div>
        ))}
      </div>
    );
  }

  const spacing = GAPS[gap];

  return (
    <Masonry
      breakpointCols={columns}
      className={`flex w-auto ${spacing.wrap}`}
      columnClassName={`${spacing.column} bg-clip-padding min-w-0`}
    >
      {items.map((item) => (
        <div key={keyOf(item)} className={spacing.item}>
          {renderCard(item)}
        </div>
      ))}
    </Masonry>
  );
};
