import { DragRect, ListItemRect } from "@/app/_types/dnd";

interface ListEntry {
  el: HTMLElement;
  rect: DragRect;
}

interface ItemEntry {
  el: HTMLElement;
  listId: string;
  index: number;
  rect: DragRect;
}

export interface RectRegistry {
  registerList: (id: string, el: HTMLElement) => void;
  unregisterList: (id: string) => void;
  registerItem: (
    id: string,
    listId: string,
    index: number,
    el: HTMLElement,
  ) => void;
  unregisterItem: (id: string) => void;
  snapshot: () => void;
  shiftBy: (scrollDx: number, scrollDy: number, scroller: Node) => void;
  listRects: () => Map<string, DragRect>;
  itemsOf: (listId: string) => ListItemRect[];
  scrollables: () => HTMLElement[];
}

const ZERO_RECT: DragRect = { top: 0, left: 0, width: 0, height: 0 };

const _toRect = (el: HTMLElement): DragRect => {
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
};

const _scrolls = (el: HTMLElement): boolean => {
  const style = window.getComputedStyle(el);
  return /(auto|scroll)/.test(
    `${style.overflow}${style.overflowX}${style.overflowY}`,
  );
};

export const createRegistry = (): RectRegistry => {
  const lists = new Map<string, ListEntry>();
  const items = new Map<string, ItemEntry>();

  return {
    registerList: (id, el) => {
      lists.set(id, { el, rect: ZERO_RECT });
    },
    unregisterList: (id) => {
      lists.delete(id);
    },
    registerItem: (id, listId, index, el) => {
      items.set(id, { el, listId, index, rect: ZERO_RECT });
    },
    unregisterItem: (id) => {
      items.delete(id);
    },
    snapshot: () => {
      lists.forEach((entry) => {
        entry.rect = _toRect(entry.el);
      });
      items.forEach((entry) => {
        entry.rect = _toRect(entry.el);
      });
    },
    shiftBy: (scrollDx, scrollDy, scroller) => {
      if (!scrollDx && !scrollDy) return;
      lists.forEach((entry) => {
        if (!scroller.contains(entry.el)) return;
        entry.rect = {
          ...entry.rect,
          left: entry.rect.left - scrollDx,
          top: entry.rect.top - scrollDy,
        };
      });
      items.forEach((entry) => {
        if (!scroller.contains(entry.el)) return;
        entry.rect = {
          ...entry.rect,
          left: entry.rect.left - scrollDx,
          top: entry.rect.top - scrollDy,
        };
      });
    },
    listRects: () => {
      const rects = new Map<string, DragRect>();
      lists.forEach((entry, id) => rects.set(id, entry.rect));
      return rects;
    },
    itemsOf: (listId) => {
      const result: ListItemRect[] = [];
      items.forEach((entry, id) => {
        if (entry.listId !== listId) return;
        result.push({ id, index: entry.index, rect: entry.rect });
      });
      return result.sort((a, b) => a.index - b.index);
    },
    scrollables: () => {
      const found = new Set<HTMLElement>();
      lists.forEach(({ el }) => {
        let node = el.parentElement;
        while (node) {
          if (_scrolls(node)) found.add(node);
          node = node.parentElement;
        }
      });
      return Array.from(found);
    },
  };
};
