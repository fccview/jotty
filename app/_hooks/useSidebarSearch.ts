import { useEffect, useState } from "react";
import type { SidebarSearch } from "@/app/_types";
import { SIDEBAR_SEARCH_DEBOUNCE_MS } from "@/app/_consts/sidebar";
import { fetchSidebarSearch } from "@/app/_utils/ui-lookups";

interface Found {
  key: string;
  result: SidebarSearch;
}

let lastFound: Found | null = null;

export const useSidebarSearch = (mode: string, query: string, stamp?: string) => {
  const needle = query.trim();
  const key = `${mode}::${stamp || ""}::${needle}`;
  const [found, setFound] = useState<Found | null>(() => (lastFound?.key === key ? lastFound : null));

  useEffect(() => {
    if (!needle || lastFound?.key === key) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      fetchSidebarSearch(mode, needle, stamp || "")
        .then((result) => {
          if (cancelled) return;
          if (!result.success || !result.data) {
            console.error("Sidebar search failed:", result.error);
            return;
          }
          lastFound = { key, result: result.data };
          setFound(lastFound);
        })
        .catch((error) => console.error("Sidebar search failed:", error));
    }, SIDEBAR_SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [mode, needle, stamp, key]);

  if (!needle) return null;
  const shown = found ?? lastFound;
  return shown?.key.startsWith(`${mode}::`) ? shown.result : null;
};
