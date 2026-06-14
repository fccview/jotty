import { create } from "zustand";
import { DragPhase, DragSize } from "@/app/_types/dnd";

interface DragState {
  phase: DragPhase;
  activeId: string | null;
  sourceListId: string | null;
  sourceIndex: number;
  targetListId: string | null;
  targetIndex: number | null;
  dragSize: DragSize;
  lift: (
    activeId: string,
    sourceListId: string,
    sourceIndex: number,
    dragSize: DragSize,
  ) => void;
  aim: (targetListId: string | null, targetIndex: number | null) => void;
  settle: () => void;
}

const IDLE_STATE = {
  phase: DragPhase.IDLE,
  activeId: null,
  sourceListId: null,
  sourceIndex: 0,
  targetListId: null,
  targetIndex: null,
  dragSize: { width: 0, height: 0 },
};

export const useDragStore = create<DragState>()((set) => ({
  ...IDLE_STATE,
  lift: (activeId, sourceListId, sourceIndex, dragSize) =>
    set({
      phase: DragPhase.DRAGGING,
      activeId,
      sourceListId,
      sourceIndex,
      targetListId: sourceListId,
      targetIndex: sourceIndex,
      dragSize,
    }),
  aim: (targetListId, targetIndex) =>
    set((state) =>
      state.targetListId === targetListId && state.targetIndex === targetIndex
        ? state
        : { targetListId, targetIndex },
    ),
  settle: () => set(IDLE_STATE),
}));
