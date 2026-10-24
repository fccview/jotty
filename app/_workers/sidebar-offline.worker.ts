import type { SidebarPage } from "@/app/_types";
import { SIDEBAR_PAGE_SIZE } from "@/app/_consts/sidebar";
import { SidebarOps, UI_API_BASE, UiAreas } from "@/app/_consts/ui-api";
import { keepOfflineFolder, offlineKey } from "@/app/_utils/offline/sidebar-cache";

export interface OfflineJob {
  username: string;
  stamp: string;
  modes: { mode: string; folders: { path: string; direct: number }[] }[];
}

let generation = 0;

const _page = async (mode: string, category: string, offset: number, stamp: string) => {
  const response = await fetch(`${UI_API_BASE}/${UiAreas.SIDEBAR}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ op: SidebarOps.ROWS, mode, category, offset, stamp }),
  });
  if (!response.ok) throw new Error(`sidebar rows answered ${response.status}`);
  const result = (await response.json()) as { success: boolean; data?: SidebarPage; error?: string };
  if (!result.success || !result.data) throw new Error(result.error || "sidebar rows failed");
  return result.data;
};

const _cacheAll = async (job: OfflineJob, mine: number) => {
  for (const { mode, folders } of job.modes) {
    for (const folder of folders) {
      const rows = [];
      for (let offset = 0; offset < folder.direct; offset += SIDEBAR_PAGE_SIZE) {
        if (mine !== generation) return;
        const page = await _page(mode, folder.path, offset, job.stamp);
        rows.push(...page.rows);
        if (page.rows.length < SIDEBAR_PAGE_SIZE) break;
      }
      if (mine !== generation) return;
      await keepOfflineFolder({ key: offlineKey(job.username, mode, folder.path), stamp: job.stamp, rows });
    }
  }
};

self.onmessage = (event: MessageEvent<OfflineJob>) => {
  const mine = ++generation;
  _cacheAll(event.data, mine).catch((error) => console.error("Offline sidebar cache stopped:", error));
};
