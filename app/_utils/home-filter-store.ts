import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ChecklistFilter = "all" | "completed" | "incomplete";

interface HomeFilterState {
    checklistFilter: ChecklistFilter;
    setChecklistFilter: (filter: ChecklistFilter) => void;
}

export const useHomeFilter = create<HomeFilterState>()(
    persist(
        (set) => ({
            checklistFilter: "all",
            setChecklistFilter: (filter) => set({ checklistFilter: filter }),
        }),
        {
            name: "checklist-home-filters",
        }
    )
);
