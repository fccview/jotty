import { create } from "zustand";

interface UIState {
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isDragging: false,
  setIsDragging: (dragging) => set({ isDragging: dragging }),
}));
