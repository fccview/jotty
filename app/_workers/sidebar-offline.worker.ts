import type { SidebarPage } from "@/app/_types";
import { SidebarOps, UI_API_BASE, UiAreas } from "@/app/_consts/ui-api";
import {
  forgetOfflineFolders,
  keepOfflineFolder,
  offlineStamps,
} from "@/app/_utils/offline/sidebar-cache";
import {
  syncOfflineSidebar,
  type OfflineJob,
  type OfflineShelf,
} from "@/app/_utils/offline/sidebar-sync";

export interface OfflineOutcome {
  stamp: string;
  done: boolean;
}

let generation = 0;

const _page = async (mode: string, category: string, offset: number, stamp: string) => {
  const response = await fetch(`${UI_API_BASE}/${UiAreas.SIDEBAR}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ op: SidebarOps.ROWS, mode, category, offset, stamp, stamped: true }),
  });
  if (!response.ok) throw new Error(`sidebar rows answered ${response.status}`);
  const result = (await response.json()) as { success: boolean; data?: SidebarPage; error?: string };
  if (!result.success || !result.data) throw new Error(result.error || "sidebar rows failed");
  return result.data;
};

const shelf: OfflineShelf = {
  page: _page,
  stamps: offlineStamps,
  keep: keepOfflineFolder,
  forget: forgetOfflineFolders,
};

const _tell = (outcome: OfflineOutcome) => self.postMessage(outcome);

self.onmessage = (event: MessageEvent<OfflineJob>) => {
  const mine = ++generation;
  const { stamp } = event.data;
  syncOfflineSidebar(event.data, shelf, () => mine === generation)
    .then(() => _tell({ stamp, done: true }))
    .catch((error) => {
      console.error("Offline sidebar cache stopped:", error);
      _tell({ stamp, done: false });
    });
};
