import { create } from "zustand";
import type { SidebarEntry, SidebarPage } from "@/app/_types";

interface StoredPage {
  stamp: string;
  rows: SidebarEntry[];
}

interface SidebarRowsState {
  pages: Record<string, StoredPage>;
  keep: (mode: string, category: string, page: number, received: SidebarPage) => void;
}

export const pageKey = (mode: string, category: string, page: number): string =>
  `${mode}::${category}::${page}`;

export const useSidebarRowsStore = create<SidebarRowsState>()((set) => ({
  pages: {},
  keep: (mode, category, page, received) =>
    set((state) => ({
      pages: {
        ...state.pages,
        [pageKey(mode, category, page)]: { stamp: received.stamp, rows: received.rows },
      },
    })),
}));
