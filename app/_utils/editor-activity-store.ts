import { create } from "zustand";

interface EditorActivityState {
  activeEditors: Set<string>;
  register: (id: string) => void;
  unregister: (id: string) => void;
  isActive: () => boolean;
}

export const useEditorActivityStore = create<EditorActivityState>()(
  (set, get) => ({
    activeEditors: new Set(),
    register: (id: string) =>
      set((state) => {
        const next = new Set(state.activeEditors);
        next.add(id);
        return { activeEditors: next };
      }),
    unregister: (id: string) =>
      set((state) => {
        const next = new Set(state.activeEditors);
        next.delete(id);
        return { activeEditors: next };
      }),
    isActive: () => get().activeEditors.size > 0,
  })
);
