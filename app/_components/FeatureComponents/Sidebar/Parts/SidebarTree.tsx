"use client";

import { ReactNode, memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Range, defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import type { AppMode, SidebarRow } from "@/app/_types";
import {
  SIDEBAR_FETCH_DEBOUNCE_MS,
  SIDEBAR_OVERSCAN,
  SIDEBAR_FOLDER_HEIGHT,
  SIDEBAR_ITEM_HEIGHT,
  SIDEBAR_VIRTUAL_THRESHOLD,
  SidebarRowKinds,
} from "@/app/_consts/sidebar";
import { contentTop, useSidebarAnchor } from "@/app/_hooks/useSidebarAnchor";

const INDICATOR_HEIGHT = 2;
const GAP_HEIGHT = 4;

const ESTIMATES: Record<SidebarRowKinds, number> = {
  [SidebarRowKinds.ROOT_START]: INDICATOR_HEIGHT,
  [SidebarRowKinds.FOLDER]: SIDEBAR_FOLDER_HEIGHT,
  [SidebarRowKinds.FOLDER_START]: INDICATOR_HEIGHT,
  [SidebarRowKinds.FOLDER_END]: INDICATOR_HEIGHT,
  [SidebarRowKinds.ITEM]: SIDEBAR_ITEM_HEIGHT,
};

const _estimate = (row: SidebarRow): number =>
  ESTIMATES[row.kind] + (row.gapDepth === undefined ? 0 : GAP_HEIGHT);

const Nest = ({ depth, children }: { depth: number; children: ReactNode }) =>
  depth <= 0 ? (
    <>{children}</>
  ) : (
    <div className="ml-2 border-l border-border/30 pl-2">
      <Nest depth={depth - 1}>{children}</Nest>
    </div>
  );

export const RowFrame = ({ row, children }: { row: SidebarRow; children: ReactNode }) =>
  row.gapDepth === undefined ? (
    <Nest depth={row.depth}>{children}</Nest>
  ) : (
    <Nest depth={row.gapDepth}>
      <div className="h-1" />
      <Nest depth={row.depth - row.gapDepth}>{children}</Nest>
    </Nest>
  );

type RenderRow = (row: SidebarRow, index: number) => ReactNode;

const TreeRow = memo(function TreeRow({
  row,
  index,
  renderRow,
}: {
  row: SidebarRow;
  index: number;
  renderRow: RenderRow;
}) {
  return <>{renderRow(row, index)}</>;
});

interface SidebarTreeProps {
  mode: AppMode | null;
  rows: SidebarRow[];
  scrollElement: HTMLElement | null;
  renderRow: RenderRow;
  onVisible: (first: number, last: number) => void;
  pinnedIndex?: number | null;
}

export const SidebarTree = ({
  mode,
  rows,
  scrollElement,
  renderRow,
  onVisible,
  pinnedIndex,
}: SidebarTreeProps) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const virtual = rows.length > SIDEBAR_VIRTUAL_THRESHOLD;

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!virtual || !scrollElement || !list) return;
    const measure = () => setScrollMargin(contentTop(list, scrollElement));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scrollElement);
    return () => observer.disconnect();
  }, [virtual, scrollElement]);

  const estimateSize = useCallback((index: number) => _estimate(rows[index]), [rows]);
  const getItemKey = useCallback((index: number) => rows[index].key, [rows]);
  const getScrollElement = useCallback(() => scrollElement, [scrollElement]);
  const initialOffset = useCallback(() => scrollElement?.scrollTop ?? 0, [scrollElement]);
  const rangeExtractor = useCallback(
    (range: Range) => {
      const indexes = defaultRangeExtractor(range);
      if (pinnedIndex == null || pinnedIndex >= rows.length || indexes.includes(pinnedIndex)) {
        return indexes;
      }
      return [...indexes, pinnedIndex].sort((a, b) => a - b);
    },
    [pinnedIndex, rows.length],
  );

  const virtualizer = useVirtualizer({
    count: rows.length,
    enabled: virtual,
    getScrollElement,
    initialOffset,
    estimateSize,
    getItemKey,
    overscan: SIDEBAR_OVERSCAN,
    scrollMargin,
    rangeExtractor,
  });

  useSidebarAnchor({
    mode,
    rows,
    scrollElement,
    listRef,
    virtualizer: virtual ? virtualizer : null,
    layoutSize: virtual ? virtualizer.getTotalSize() + scrollMargin : 0,
  });

  const windowed = virtual ? virtualizer.getVirtualItems() : [];
  const first = virtual ? (windowed[0]?.index ?? 0) : 0;
  const last = virtual ? (windowed[windowed.length - 1]?.index ?? -1) : rows.length - 1;

  useEffect(() => {
    const timer = setTimeout(() => onVisible(first, last), SIDEBAR_FETCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [first, last, onVisible]);

  if (!virtual) {
    return (
      <div ref={listRef}>
        {rows.map((row, index) => (
          <div key={row.key}>
            <TreeRow row={row} index={index} renderRow={renderRow} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div ref={listRef} className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
      {windowed.map((item) => (
        <div
          key={item.key}
          data-index={item.index}
          ref={virtualizer.measureElement}
          className="absolute left-0 top-0 w-full"
          style={{
            transform: `translateY(${item.start - scrollMargin}px)`,
            zIndex: item.index === pinnedIndex ? 1 : undefined,
          }}
        >
          <TreeRow row={rows[item.index]} index={item.index} renderRow={renderRow} />
        </div>
      ))}
    </div>
  );
};
