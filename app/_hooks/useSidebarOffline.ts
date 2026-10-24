import { useEffect } from "react";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import type { OfflineJob } from "@/app/_workers/sidebar-offline.worker";
import { libraryEpoch } from "@/app/_utils/sidebar-tree-utils";

const OFFLINE_SETTLE_MS = 3_000;
const OFFLINE_MODES = ["notes", "checklists"] as const;

let worker: Worker | null = null;
let cachedStamp: string | null = null;

const _worker = (): Worker | null => {
  if (worker || typeof Worker === "undefined") return worker;
  try {
    worker = new Worker(new URL("../_workers/sidebar-offline.worker.ts", import.meta.url), { type: "module" });
  } catch (error) {
    console.error("Offline sidebar cache could not start:", error);
  }
  return worker;
};

export const useSidebarOffline = () => {
  const { sidebar, user } = useAppMode();
  const username = user?.username;
  const stamp = sidebar.notes || sidebar.checklists ? libraryEpoch(sidebar) : "";

  useEffect(() => {
    if (!username || !stamp || cachedStamp === stamp) return;
    const timer = setTimeout(() => {
      if (!navigator.onLine) return;
      const job: OfflineJob = {
        username,
        stamp,
        modes: OFFLINE_MODES.map((mode) => ({
          mode,
          folders: Object.entries(sidebar[mode]?.folders || {}).map(([path, stats]) => ({
            path,
            direct: stats.direct,
          })),
        })),
      };
      const runner = _worker();
      if (!runner) return;
      runner.postMessage(job);
      cachedStamp = stamp;
    }, OFFLINE_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [username, stamp, sidebar]);
};
