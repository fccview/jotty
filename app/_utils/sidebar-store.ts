import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SidebarState {
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;

  collapsedCategories: Record<string, string[]>;
  toggleCategory: (mode: string, path: string) => void;
  expandCategoryPath: (mode: string, categoryPath: string) => void;
  setAllCategoriesCollapsed: (mode: string, paths: string[], collapsed: boolean) => void;
  isCollapsed: (mode: string, path: string) => boolean;

  sharedItemsCollapsed: boolean;
  setSharedItemsCollapsed: (collapsed: boolean) => void;

  tagsCollapsed: boolean;
  setTagsCollapsed: (collapsed: boolean) => void;

  categoriesSectionCollapsed: boolean;
  setCategoriesSectionCollapsed: (collapsed: boolean) => void;

  collapsedTags: string[];
  toggleTag: (tagPath: string) => void;
  isTagCollapsed: (tagPath: string) => boolean;

  scrollTop: number;
  setScrollTop: (scrollTop: number) => void;
}

const migrateOldLocalStorage = (): Partial<SidebarState> => {
  if (typeof window === "undefined") return {};

  const migrated: Partial<SidebarState> = {};

  try {
    const oldWidth = localStorage.getItem("sidebar-width");
    if (oldWidth) {
      const width = parseInt(oldWidth);
      if (width >= 320 && width <= 800) {
        migrated.sidebarWidth = width;
      }
      localStorage.removeItem("sidebar-width");
    }

    const oldChecklistsCollapsed = localStorage.getItem("sidebar-collapsed-categories-checklists");
    const oldNotesCollapsed = localStorage.getItem("sidebar-collapsed-categories-notes");
    if (oldChecklistsCollapsed || oldNotesCollapsed) {
      migrated.collapsedCategories = {
        checklists: oldChecklistsCollapsed ? JSON.parse(oldChecklistsCollapsed) : [],
        notes: oldNotesCollapsed ? JSON.parse(oldNotesCollapsed) : [],
      };
      localStorage.removeItem("sidebar-collapsed-categories-checklists");
      localStorage.removeItem("sidebar-collapsed-categories-notes");
    }

    const oldSharedCollapsed = localStorage.getItem("sidebar-shared-items-collapsed");
    if (oldSharedCollapsed) {
      migrated.sharedItemsCollapsed = JSON.parse(oldSharedCollapsed);
      localStorage.removeItem("sidebar-shared-items-collapsed");
    }

    const oldTagsCollapsed = localStorage.getItem("sidebar-tags-collapsed");
    if (oldTagsCollapsed) {
      migrated.tagsCollapsed = JSON.parse(oldTagsCollapsed);
      localStorage.removeItem("sidebar-tags-collapsed");
    }

    const oldCategoriesSectionCollapsed = localStorage.getItem("sidebar-categories-section-collapsed");
    if (oldCategoriesSectionCollapsed) {
      migrated.categoriesSectionCollapsed = JSON.parse(oldCategoriesSectionCollapsed);
      localStorage.removeItem("sidebar-categories-section-collapsed");
    }

    const oldCollapsedTags = localStorage.getItem("sidebar-collapsed-tags");
    if (oldCollapsedTags) {
      migrated.collapsedTags = JSON.parse(oldCollapsedTags);
      localStorage.removeItem("sidebar-collapsed-tags");
    }
  } catch (error) {
    console.error("Failed to migrate old sidebar localStorage:", error);
  }

  return migrated;
};

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      sidebarWidth: 320,
      setSidebarWidth: (width) => set({ sidebarWidth: Math.max(320, Math.min(800, width)) }),

      collapsedCategories: {
        checklists: [],
        notes: [],
      },
      toggleCategory: (mode, path) =>
        set((state) => {
          const current = state.collapsedCategories[mode] || [];
          const newPaths = current.includes(path)
            ? current.filter((p) => p !== path)
            : [...current, path];
          return {
            collapsedCategories: {
              ...state.collapsedCategories,
              [mode]: newPaths,
            },
          };
        }),
      expandCategoryPath: (mode, categoryPath) =>
        set((state) => {
          if (!categoryPath) return state;
          const pathParts = categoryPath.split("/");
          const pathsToExpand: string[] = [];
          let currentPath = "";
          for (const part of pathParts) {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            pathsToExpand.push(currentPath);
          }
          const current = state.collapsedCategories[mode] || [];
          return {
            collapsedCategories: {
              ...state.collapsedCategories,
              [mode]: current.filter((p) => !pathsToExpand.includes(p)),
            },
          };
        }),
      setAllCategoriesCollapsed: (mode, paths, collapsed) =>
        set((state) => ({
          collapsedCategories: {
            ...state.collapsedCategories,
            [mode]: collapsed ? paths : [],
          },
        })),
      isCollapsed: (mode, path) => {
        const state = get();
        return (state.collapsedCategories[mode] || []).includes(path);
      },

      sharedItemsCollapsed: false,
      setSharedItemsCollapsed: (collapsed) => set({ sharedItemsCollapsed: collapsed }),

      tagsCollapsed: true,
      setTagsCollapsed: (collapsed) => set({ tagsCollapsed: collapsed }),

      categoriesSectionCollapsed: false,
      setCategoriesSectionCollapsed: (collapsed) => set({ categoriesSectionCollapsed: collapsed }),

      collapsedTags: [],
      toggleTag: (tagPath) =>
        set((state) => {
          const newTags = state.collapsedTags.includes(tagPath)
            ? state.collapsedTags.filter((t) => t !== tagPath)
            : [...state.collapsedTags, tagPath];
          return { collapsedTags: newTags };
        }),
      isTagCollapsed: (tagPath) => {
        const state = get();
        return state.collapsedTags.includes(tagPath);
      },

      scrollTop: 0,
      setScrollTop: (scrollTop) => set({ scrollTop }),
    }),
    {
      name: "sidebar-state",
      partialize: (state) => {
        const { scrollTop, ...rest } = state;
        return rest;
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const migrated = migrateOldLocalStorage();
        if (Object.keys(migrated).length > 0) {
          Object.assign(state, migrated);
        }
      },
    }
  )
);
