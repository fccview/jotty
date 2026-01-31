import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NotesState {
  showTOC: boolean;
  setShowTOC: (show: boolean) => void;

  showLineNumbers: boolean;
  setShowLineNumbers: (show: boolean) => void;

  showRuler: boolean;
  setShowRuler: (show: boolean) => void;

  showVisualGuides: boolean;
  setShowVisualGuides: (show: boolean) => void;
  visualGuideColumns: number[];
  setVisualGuideColumns: (columns: number[]) => void;
  addVisualGuideColumn: (column: number) => void;
  removeVisualGuideColumn: (column: number) => void;
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set) => ({
      showTOC: false,
      setShowTOC: (show) => set({ showTOC: show }),

      showLineNumbers: true,
      setShowLineNumbers: (show) => set({ showLineNumbers: show }),

      showRuler: false,
      setShowRuler: (show) => set({ showRuler: show }),

      showVisualGuides: false,
      setShowVisualGuides: (show) => set({ showVisualGuides: show }),
      visualGuideColumns: [],
      setVisualGuideColumns: (columns) => set({ visualGuideColumns: columns.sort((a, b) => a - b) }),
      addVisualGuideColumn: (column) =>
        set((state) => {
          if (state.visualGuideColumns.includes(column)) return state;
          return { showVisualGuides: true, visualGuideColumns: [...state.visualGuideColumns, column].sort((a, b) => a - b) };
        }),
      removeVisualGuideColumn: (column) =>
        set((state) => ({
          visualGuideColumns: state.visualGuideColumns.filter((c) => c !== column),
        })),
    }),
    {
      name: "notes-state",
    }
  )
);
