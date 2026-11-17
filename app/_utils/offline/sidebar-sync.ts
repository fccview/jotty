import type { SidebarEntry, SidebarPage } from "@/app/_types";
import { SIDEBAR_PAGE_SIZE } from "@/app/_consts/sidebar";
import { offlineKey, type OfflineFolder } from "./sidebar-cache";

export interface OfflineFolderJob {
  path: string;
  direct: number;
  stamp: string;
}

export interface OfflineJob {
  username: string;
  stamp: string;
  modes: { mode: string; folders: OfflineFolderJob[] }[];
}

export interface OfflineShelf {
  page: (mode: string, category: string, offset: number, stamp: string) => Promise<SidebarPage>;
  stamps: (username: string, mode: string) => Promise<Map<string, string>>;
  keep: (folder: OfflineFolder) => Promise<unknown>;
  forget: (keys: string[]) => Promise<unknown>;
}

interface FolderCopy {
  rows: SidebarEntry[];
  stamp: string;
}

const UNSETTLED = "";

const _copyOf = async (
  shelf: OfflineShelf,
  mode: string,
  folder: OfflineFolderJob,
  stamp: string,
  live: () => boolean,
): Promise<FolderCopy | null> => {
  if (!folder.direct) return { rows: [], stamp: folder.stamp };
  const rows: SidebarEntry[] = [];
  const served = new Set<string>();
  for (let offset = 0; ; offset += SIDEBAR_PAGE_SIZE) {
    if (!live()) return null;
    const page = await shelf.page(mode, folder.path, offset, stamp);
    rows.push(...page.rows);
    served.add(page.folderStamp ?? UNSETTLED);
    if (page.rows.length < SIDEBAR_PAGE_SIZE || offset + SIDEBAR_PAGE_SIZE >= page.total) break;
  }
  return { rows, stamp: served.size === 1 ? Array.from(served)[0] : UNSETTLED };
};

export const syncOfflineSidebar = async (job: OfflineJob, shelf: OfflineShelf, live: () => boolean) => {
  for (const { mode, folders } of job.modes) {
    if (!live()) return;
    const keyOf = (category: string) => offlineKey(job.username, mode, category);
    const kept = await shelf.stamps(job.username, mode);
    const wanted = new Set(folders.map((folder) => keyOf(folder.path)));
    const strays = Array.from(kept.keys()).filter((key) => !wanted.has(key));
    if (folders.length && strays.length && live()) await shelf.forget(strays);

    for (const folder of folders) {
      if (!live()) return;
      const key = keyOf(folder.path);
      if (kept.get(key) === folder.stamp) continue;
      const copy = await _copyOf(shelf, mode, folder, job.stamp, live);
      if (!copy || !live()) return;
      await shelf.keep({ key, username: job.username, mode, ...copy });
    }
  }
};
