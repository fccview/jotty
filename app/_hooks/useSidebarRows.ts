import { useCallback } from "react";
import type { SidebarEntry, SidebarSnapshot } from "@/app/_types";
import { SIDEBAR_PAGE_SIZE } from "@/app/_consts/sidebar";
import { fetchSidebarRows } from "@/app/_utils/ui-lookups";
import { pageKey, useSidebarRowsStore } from "@/app/_utils/sidebar-rows-store";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { offlineFolder, offlineKey } from "@/app/_utils/offline/sidebar-cache";

export interface RowWant {
  category: string;
  index: number;
}

const inFlight = new Set<string>();

const _pageOf = (index: number): number => Math.floor(index / SIDEBAR_PAGE_SIZE);

export const useSidebarRows = (mode: string, snapshot?: SidebarSnapshot) => {
  const pages = useSidebarRowsStore((state) => state.pages);
  const keep = useSidebarRowsStore((state) => state.keep);
  const username = useAppMode().user?.username;

  const fromOffline = useCallback(
    async (category: string) => {
      if (!username) return;
      const folder = await offlineFolder(offlineKey(username, mode, category)).catch((error) => {
        console.error(`Offline sidebar has nothing for ${category}:`, error);
        return undefined;
      });
      if (!folder) return;
      for (let page = 0; page * SIDEBAR_PAGE_SIZE < folder.rows.length; page++) {
        keep(mode, category, page, {
          stamp: `offline:${folder.stamp}`,
          total: folder.rows.length,
          rows: folder.rows.slice(page * SIDEBAR_PAGE_SIZE, (page + 1) * SIDEBAR_PAGE_SIZE),
        });
      }
    },
    [username, mode, keep],
  );

  const entryAt = useCallback(
    (category: string, index: number): SidebarEntry | undefined =>
      snapshot?.rows[category]?.[index] ??
      pages[pageKey(mode, category, _pageOf(index))]?.rows[index % SIDEBAR_PAGE_SIZE],
    [snapshot, pages, mode],
  );

  const ensure = useCallback(
    (wants: RowWant[]) => {
      if (!snapshot) return;
      const needed = new Map<string, { category: string; page: number }>();

      wants.forEach(({ category, index }) => {
        if (index < (snapshot.rows[category]?.length || 0)) return;
        const page = _pageOf(index);
        const key = pageKey(mode, category, page);
        if (pages[key]?.stamp !== snapshot.stamp) needed.set(key, { category, page });
      });

      needed.forEach(({ category, page }, key) => {
        const flight = `${key}::${snapshot.stamp}`;
        if (inFlight.has(flight)) return;
        inFlight.add(flight);
        if (!navigator.onLine) {
          fromOffline(category).finally(() => inFlight.delete(flight));
          return;
        }
        fetchSidebarRows(mode, category, page * SIDEBAR_PAGE_SIZE, snapshot.stamp)
          .then((result) => {
            if (result.success && result.data) keep(mode, category, page, result.data);
            else return fromOffline(category);
          })
          .catch((error) => {
            console.error(`Sidebar could not load ${category} page ${page}, trying the offline copy:`, error);
            return fromOffline(category);
          })
          .finally(() => inFlight.delete(flight));
      });
    },
    [snapshot, pages, mode, keep, fromOffline],
  );

  return { entryAt, ensure };
};
