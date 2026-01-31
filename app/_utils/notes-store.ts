import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NotesState {
  showTOC: boolean;
  setShowTOC: (show: boolean) => void;
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set) => ({
      showTOC: false,
      setShowTOC: (show) => set({ showTOC: show }),
    }),
    {
      name: "notes-state",
    }
  )
);
