"use client";

import { useCallback, useEffect, useRef } from "react";
import { DragPhase } from "@/app/_types/dnd";
import { CARD_GAP_PX } from "@/app/_consts/dnd";
import { useDragStore } from "@/app/_utils/dnd/drag-store";
import { useDndContext } from "./DndProvider";

export const useDropList = ({ id }: { id: string }) => {
  const { registry } = useDndContext();
  const elRef = useRef<HTMLElement | null>(null);

  const setNodeRef = useCallback((el: HTMLElement | null) => {
    elRef.current = el;
  }, []);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    registry.registerList(id, el);
    return () => registry.unregisterList(id);
  }, [registry, id]);

  const isOver = useDragStore(
    (s) => s.phase === DragPhase.DRAGGING && s.targetListId === id,
  );
  const padBottom = useDragStore((s) =>
    s.phase === DragPhase.DRAGGING &&
    s.targetListId === id &&
    s.sourceListId !== id
      ? s.dragSize.height + CARD_GAP_PX
      : 0,
  );

  return { setNodeRef, isOver, padBottom };
};
