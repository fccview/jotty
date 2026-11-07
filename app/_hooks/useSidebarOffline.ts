import { useEffect, useState } from "react";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import type { OfflineJob } from "@/app/_utils/offline/sidebar-sync";
import type { OfflineOutcome } from "@/app/_workers/sidebar-offline.worker";
import { libraryEpoch } from "@/app/_utils/sidebar-tree-utils";

const OFFLINE_SETTLE_MS = 3_000;
const OFFLINE_RETRY_MS = 30_000;
const OFFLINE_MODES = ["notes", "checklists"] as const;
const ONLINE_EVENT = "online";

let worker: Worker | null = null;
let cachedStamp: string | null = null;
let retry: (() => void) | null = null;

const _worker = (): Worker | null => {
  if (worker || typeof Worker === "undefined") return worker;
  try {
    worker = new Worker(new URL("../_workers/sidebar-offline.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = ({ data }: MessageEvent<OfflineOutcome>) => {
      if (data.done || cachedStamp !== data.stamp) return;
      cachedStamp = null;
      setTimeout(() => retry?.(), OFFLINE_RETRY_MS);
    };
  } catch (error) {
    console.error("Offline sidebar cache could not start:", error);
  }
  return worker;
};

export const useSidebarOffline = () => {
  const { sidebar, user } = useAppMode();
  const username = user?.username;
  const stamp = sidebar.notes || sidebar.checklists ? libraryEpoch(sidebar) : "";
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const again = () => setAttempt((count) => count + 1);
    retry = again;
    window.addEventListener(ONLINE_EVENT, again);
    return () => {
      window.removeEventListener(ONLINE_EVENT, again);
      if (retry === again) retry = null;
    };
  }, []);

  useEffect(() => {
    if (!username || !stamp || cachedStamp === stamp) return;
    const timer = setTimeout(() => {
      if (!navigator.onLine) return;
      const job: OfflineJob = {
        username,
        stamp,
        modes: OFFLINE_MODES.filter((mode) => sidebar[mode]).map((mode) => ({
          mode,
          folders: Object.entries(sidebar[mode]?.folders || {}).map(([path, stats]) => ({
            path,
            direct: stats.direct,
            stamp: stats.stamp,
          })),
        })),
      };
      const runner = _worker();
      if (!runner) return;
      runner.postMessage(job);
      cachedStamp = stamp;
    }, OFFLINE_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [username, stamp, sidebar, attempt]);
};
