"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { DragRect, DropResult } from "@/app/_types/dnd";
import {
  DRAG_THRESHOLD_PX,
  LONG_PRESS_MS,
  TOUCH_SLOP_PX,
  INTERACTIVE_SELECTOR,
} from "@/app/_consts/dnd";
import { findDropList, projectIndex } from "@/app/_utils/dnd/dnd-math";
import { createRegistry, RectRegistry } from "@/app/_utils/dnd/rect-registry";
import { createScroller } from "@/app/_utils/dnd/auto-scroll";
import { useDragStore } from "@/app/_utils/dnd/drag-store";

interface BeginArgs {
  id: string;
  listId: string;
  index: number;
}

interface DndContextValue {
  registry: RectRegistry;
  begin: (event: React.PointerEvent, args: BeginArgs) => void;
}

interface DndProviderProps {
  onDrop: (result: DropResult) => void;
  onDragStart?: (itemId: string) => void;
  onDragCancel?: (itemId: string) => void;
  renderGhost: (itemId: string, rect: DragRect) => ReactNode;
  children: ReactNode;
}

interface DragSession {
  pointerId: number;
  isTouch: boolean;
  itemId: string;
  listId: string;
  index: number;
  sourceEl: HTMLElement;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  grabX: number;
  grabY: number;
  longPressTimer: number | null;
  dragging: boolean;
}

const DndContext = createContext<DndContextValue | null>(null);

export const useDndContext = (): DndContextValue => {
  const ctx = useContext(DndContext);
  if (!ctx) throw new Error("dnd hooks must be used inside a DndProvider");
  return ctx;
};

export const DndProvider = ({
  onDrop,
  onDragStart,
  onDragCancel,
  renderGhost,
  children,
}: DndProviderProps) => {
  const registryRef = useRef<RectRegistry | null>(null);
  if (!registryRef.current) registryRef.current = createRegistry();
  const registry = registryRef.current;

  const scrollerRef = useRef(createScroller());
  const sessionRef = useRef<DragSession | null>(null);
  const ghostNodeRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const scrollPosRef = useRef(new Map<HTMLElement, { x: number; y: number }>());
  const callbacksRef = useRef({ onDrop, onDragStart, onDragCancel });
  callbacksRef.current = { onDrop, onDragStart, onDragCancel };

  const [ghost, setGhost] = useState<{ id: string; rect: DragRect } | null>(
    null,
  );

  const _moveGhost = useCallback((x: number, y: number) => {
    const session = sessionRef.current;
    const node = ghostNodeRef.current;
    if (!session || !node) return;
    node.style.transform = `translate3d(${x - session.grabX}px, ${
      y - session.grabY
    }px, 0)`;
  }, []);

  const _project = useCallback(() => {
    const session = sessionRef.current;
    if (!session || !session.dragging) return;
    const point = { x: session.lastX, y: session.lastY };
    const listId = findDropList(point, registry.listRects());
    if (!listId) {
      useDragStore.getState().aim(null, null);
      return;
    }
    const index = projectIndex(point.y, registry.itemsOf(listId), session.itemId);
    useDragStore.getState().aim(listId, index);
  }, [registry]);

  const _schedule = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const session = sessionRef.current;
      if (!session || !session.dragging) return;
      _moveGhost(session.lastX, session.lastY);
      _project();
      scrollerRef.current.update({ x: session.lastX, y: session.lastY });
    });
  }, [_moveGhost, _project]);

  const _blockTouch = useCallback((event: TouchEvent) => {
    event.preventDefault();
  }, []);

  const _blockMenu = useCallback((event: Event) => {
    event.preventDefault();
  }, []);

  const _onScroll = useCallback(
    (event: Event) => {
      const session = sessionRef.current;
      if (!session || !session.dragging) return;
      const target =
        event.target === document
          ? (document.scrollingElement as HTMLElement | null)
          : (event.target as HTMLElement);
      if (!target) return;
      const prev = scrollPosRef.current.get(target);
      if (!prev) return;
      const next = { x: target.scrollLeft, y: target.scrollTop };
      scrollPosRef.current.set(target, next);
      registry.shiftBy(next.x - prev.x, next.y - prev.y, target);
      _schedule();
    },
    [registry, _schedule],
  );

  const _teardown = useCallback(() => {
    const session = sessionRef.current;
    if (session?.longPressTimer !== null && session?.longPressTimer !== undefined) {
      window.clearTimeout(session.longPressTimer);
    }
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    scrollerRef.current.stop();
    scrollPosRef.current.clear();
    document.removeEventListener("touchmove", _blockTouch);
    document.removeEventListener("contextmenu", _blockMenu);
    window.removeEventListener("scroll", _onScroll, true);
    document.body.style.userSelect = "";
    document.body.style.webkitUserSelect = "";
    sessionRef.current = null;
    setGhost(null);
    useDragStore.getState().settle();
  }, [_blockTouch, _blockMenu, _onScroll]);

  const _finish = useCallback(
    (cancelled: boolean) => {
      const session = sessionRef.current;
      if (!session) return;

      if (session.dragging) {
        const { activeId, sourceListId, sourceIndex, targetListId, targetIndex } =
          useDragStore.getState();
        const moved =
          targetListId !== null &&
          targetIndex !== null &&
          !(targetListId === sourceListId && targetIndex === sourceIndex);

        if (!cancelled && moved && activeId && sourceListId) {
          callbacksRef.current.onDrop({
            itemId: activeId,
            sourceListId,
            sourceIndex,
            targetListId,
            targetIndex,
          });
        } else {
          callbacksRef.current.onDragCancel?.(session.itemId);
        }
      }
      _teardown();
    },
    [_teardown],
  );

  const _lift = useCallback(() => {
    const session = sessionRef.current;
    if (!session || session.dragging) return;
    session.dragging = true;
    session.longPressTimer = null;

    try {
      session.sourceEl.setPointerCapture(session.pointerId);
    } catch (error) {
      console.warn("pointer capture failed, continuing drag:", error);
    }

    registry.snapshot();
    const sourceRect = registry
      .itemsOf(session.listId)
      .find((entry) => entry.id === session.itemId)?.rect;
    const rect: DragRect = sourceRect || {
      top: session.startY,
      left: session.startX,
      width: 0,
      height: 0,
    };
    session.grabX = session.startX - rect.left;
    session.grabY = session.startY - rect.top;

    const scrollers = registry.scrollables();
    scrollPosRef.current.clear();
    scrollers.forEach((el) =>
      scrollPosRef.current.set(el, { x: el.scrollLeft, y: el.scrollTop }),
    );
    scrollerRef.current.start(scrollers);

    document.addEventListener("touchmove", _blockTouch, { passive: false });
    document.addEventListener("contextmenu", _blockMenu);
    window.addEventListener("scroll", _onScroll, true);
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";

    useDragStore
      .getState()
      .lift(session.itemId, session.listId, session.index, {
        width: rect.width,
        height: rect.height,
      });
    setGhost({ id: session.itemId, rect });
    callbacksRef.current.onDragStart?.(session.itemId);
    _schedule();
  }, [registry, _blockTouch, _blockMenu, _onScroll, _schedule]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const session = sessionRef.current;
      if (!session || event.pointerId !== session.pointerId) return;
      session.lastX = event.clientX;
      session.lastY = event.clientY;

      if (session.dragging) {
        _schedule();
        return;
      }

      const distance = Math.hypot(
        event.clientX - session.startX,
        event.clientY - session.startY,
      );
      if (session.isTouch) {
        if (distance > TOUCH_SLOP_PX) _teardown();
        return;
      }
      if (distance > DRAG_THRESHOLD_PX) _lift();
    };

    const onUp = (event: PointerEvent) => {
      const session = sessionRef.current;
      if (!session || event.pointerId !== session.pointerId) return;
      _finish(false);
    };

    const onCancel = (event: PointerEvent) => {
      const session = sessionRef.current;
      if (!session || event.pointerId !== session.pointerId) return;
      _finish(true);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const session = sessionRef.current;
      if (!session || !session.dragging) return;
      event.preventDefault();
      event.stopPropagation();
      _finish(true);
    };

    const onBlur = () => {
      if (sessionRef.current) _finish(true);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("blur", onBlur);
      _teardown();
    };
  }, [_schedule, _lift, _finish, _teardown]);

  const begin = useCallback(
    (event: React.PointerEvent, args: BeginArgs) => {
      if (sessionRef.current) return;
      if (event.button !== 0) return;
      const target = event.target as HTMLElement;
      if (target.closest(INTERACTIVE_SELECTOR)) return;

      const isTouch = event.pointerType === "touch";
      const session: DragSession = {
        pointerId: event.pointerId,
        isTouch,
        itemId: args.id,
        listId: args.listId,
        index: args.index,
        sourceEl: event.currentTarget as HTMLElement,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        grabX: 0,
        grabY: 0,
        longPressTimer: null,
        dragging: false,
      };
      sessionRef.current = session;

      if (isTouch) {
        session.longPressTimer = window.setTimeout(_lift, LONG_PRESS_MS);
      }
    },
    [_lift],
  );

  const contextValue = useMemo(
    () => ({ registry, begin }),
    [registry, begin],
  );

  return (
    <DndContext.Provider value={contextValue}>
      {children}
      {ghost &&
        createPortal(
          <div
            ref={ghostNodeRef}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: ghost.rect.width,
              height: ghost.rect.height,
              transform: `translate3d(${ghost.rect.left}px, ${ghost.rect.top}px, 0)`,
              zIndex: 9999,
              pointerEvents: "none",
            }}
          >
            {renderGhost(ghost.id, ghost.rect)}
          </div>,
          document.body,
        )}
    </DndContext.Provider>
  );
};
