"use client";

import { useCallback, useEffect, useMemo, useRef, CSSProperties } from "react";
import { DragPhase } from "@/app/_types/dnd";
import { CARD_GAP_PX } from "@/app/_consts/dnd";
import { displaceFor } from "@/app/_utils/dnd/dnd-math";
import { useDragStore } from "@/app/_utils/dnd/drag-store";
import { useDndContext } from "./DndProvider";

interface UseDragItemArgs {
  id: string;
  listId: string;
  index: number;
  disabled?: boolean;
  ghost?: boolean;
}

const BASE_STYLE: CSSProperties = { touchAction: "manipulation" };

export const useDragItem = ({
  id,
  listId,
  index,
  disabled,
  ghost,
}: UseDragItemArgs) => {
  const { registry, begin } = useDndContext();
  const elRef = useRef<HTMLElement | null>(null);

  const setNodeRef = useCallback((el: HTMLElement | null) => {
    elRef.current = el;
  }, []);

  useEffect(() => {
    const el = elRef.current;
    if (!el || ghost) return;
    registry.registerItem(id, listId, index, el);
    return () => registry.unregisterItem(id);
  }, [registry, id, listId, index, ghost]);

  const isLifted = useDragStore(
    (s) => !ghost && s.phase === DragPhase.DRAGGING && s.activeId === id,
  );
  const isAway = useDragStore(
    (s) =>
      !ghost &&
      s.phase === DragPhase.DRAGGING &&
      s.activeId === id &&
      s.targetListId !== listId,
  );
  const dragHeight = useDragStore((s) =>
    !ghost && s.phase === DragPhase.DRAGGING && s.activeId === id
      ? s.dragSize.height
      : 0,
  );
  const shiftY = useDragStore((s) => {
    if (ghost || s.phase !== DragPhase.DRAGGING || s.activeId === id) return 0;
    if (s.targetListId !== listId) return 0;
    const sameList = s.sourceListId === listId;
    const effIndex = sameList && index > s.sourceIndex ? index - 1 : index;
    return displaceFor(
      effIndex,
      sameList ? s.sourceIndex : null,
      s.targetIndex,
      s.dragSize.height,
    );
  });

  const style = useMemo<CSSProperties>(() => {
    if (isLifted && isAway) {
      return {
        ...BASE_STYLE,
        height: 0,
        marginTop: -CARD_GAP_PX,
        paddingTop: 0,
        paddingBottom: 0,
        borderTopWidth: 0,
        borderBottomWidth: 0,
        overflow: "hidden",
      };
    }
    if (isLifted) {
      return { ...BASE_STYLE, height: dragHeight || undefined };
    }
    if (shiftY !== 0) {
      return { ...BASE_STYLE, transform: `translateY(${shiftY}px)` };
    }
    return BASE_STYLE;
  }, [isLifted, isAway, dragHeight, shiftY]);

  const handleProps = useMemo(
    () => ({
      onPointerDown: (event: React.PointerEvent) => {
        if (disabled || ghost) return;
        begin(event, { id, listId, index });
      },
    }),
    [begin, disabled, ghost, id, listId, index],
  );

  return { setNodeRef, handleProps, isLifted, isAway, style };
};
