import { RefObject, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import type { Virtualizer } from "@tanstack/react-virtual";
import type { AppMode, SidebarAnchor, SidebarRow } from "@/app/_types";

const anchors = new Map<AppMode, SidebarAnchor>();

interface RowSpot {
  index: number;
  start: number;
}

interface AnchorProps {
  mode: AppMode | null;
  rows: SidebarRow[];
  scrollElement: HTMLElement | null;
  listRef: RefObject<HTMLDivElement | null>;
  virtualizer: Virtualizer<HTMLElement, Element> | null;
  layoutSize: number;
}

export const contentTop = (element: Element, scroller: HTMLElement): number =>
  element.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;

export const useSidebarAnchor = ({
  mode,
  rows,
  scrollElement,
  listRef,
  virtualizer,
  layoutSize,
}: AnchorProps) => {
  const settled = useRef<number | null>(null);
  const tried = useRef<AppMode | null>(null);
  const latest = useRef({ mode, rows });

  useLayoutEffect(() => {
    latest.current = { mode, rows };
  }, [mode, rows]);

  const startOf = useCallback(
    (index: number): number | undefined => {
      if (!scrollElement) return undefined;
      if (virtualizer) return virtualizer.measurementsCache[index]?.start;
      const row = listRef.current?.children[index];
      return row ? contentTop(row, scrollElement) : undefined;
    },
    [scrollElement, virtualizer, listRef],
  );

  const rowAt = useCallback(
    (top: number): RowSpot | undefined => {
      if (!scrollElement) return undefined;
      if (virtualizer) {
        const item = virtualizer.getVirtualItemForOffset(top);
        return item && { index: item.index, start: item.start };
      }
      const children = listRef.current?.children;
      if (!children?.length) return undefined;
      let low = 0;
      let high = children.length - 1;
      while (low < high) {
        const middle = (low + high) >> 1;
        const row = children[middle];
        if (contentTop(row, scrollElement) + row.getBoundingClientRect().height <= top) low = middle + 1;
        else high = middle;
      }
      return { index: low, start: contentTop(children[low], scrollElement) };
    },
    [scrollElement, virtualizer, listRef],
  );

  useLayoutEffect(() => {
    if (!scrollElement || !mode) return;
    const fresh = tried.current !== mode;
    const strayed = settled.current !== null && Math.abs(scrollElement.scrollTop - settled.current) >= 1;
    if (!fresh && strayed) return;
    tried.current = mode;
    const anchor = anchors.get(mode);
    const index = anchor ? rows.findIndex((row) => row.key === anchor.key) : -1;
    const start = index < 0 ? undefined : startOf(index);
    const target =
      anchor && start !== undefined ? start + anchor.offset : fresh ? (anchor?.top ?? 0) : undefined;
    if (target === undefined) return;
    if (Math.abs(scrollElement.scrollTop - target) >= 1) scrollElement.scrollTop = target;
    settled.current = scrollElement.scrollTop;
  }, [mode, rows, scrollElement, startOf, layoutSize]);

  useEffect(() => {
    if (!scrollElement) return;
    let frame = 0;
    const capture = () => {
      frame = 0;
      const { mode: current, rows: shown } = latest.current;
      if (!current) return;
      const top = scrollElement.scrollTop;
      if (settled.current !== null && Math.abs(top - settled.current) < 1) return;
      settled.current = top;
      const spot = rowAt(top);
      const row = spot && shown[spot.index];
      if (!spot || !row) return;
      anchors.set(current, { key: row.key, offset: top - spot.start, top });
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(capture);
    };
    scrollElement.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      scrollElement.removeEventListener("scroll", onScroll);
    };
  }, [scrollElement, rowAt]);
};
