import fs from "fs";
import path from "path";
import { itemTreeRoots } from "./paths";
import { refreshItemPaths } from "./indexer";

export const WATCH_FLUSH_MS = 60_000;
export const WATCH_SETTLE_MS = 1_000;
const ARCHIVE_DIR = ".archive";

interface Batcher {
  add: (target: string) => void;
  stop: () => void;
}

interface WatchState {
  watchers: fs.FSWatcher[];
  batcher: Batcher;
  healthy: boolean;
}

declare global {
  var __jottyRelationsWatch: WatchState | undefined;
}

export const throttledBatch = (
  flush: (targets: string[]) => Promise<unknown>,
  everyMs: number,
  settleMs = WATCH_SETTLE_MS,
  now: () => number = Date.now,
): Batcher => {
  const dirty = new Set<string>();
  let lastFlush = -Infinity;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;

  const run = async () => {
    timer = null;
    if (running) {
      schedule();
      return;
    }
    running = true;
    lastFlush = now();
    const targets = Array.from(dirty);
    dirty.clear();
    try {
      await flush(targets);
    } catch (error) {
      console.error("Relations watch flush failed:", error);
    } finally {
      running = false;
      if (dirty.size > 0) schedule();
    }
  };

  const schedule = () => {
    if (timer) return;
    const wait = Math.max(settleMs, lastFlush + everyMs - now());
    timer = setTimeout(run, wait);
    timer.unref?.();
  };

  return {
    add: (target) => {
      dirty.add(target);
      schedule();
    },
    stop: () => {
      if (timer) clearTimeout(timer);
      timer = null;
      dirty.clear();
    },
  };
};

const _ignored = (filename: string): boolean =>
  filename
    .split(/[\\/]+/)
    .some((part) => part.startsWith(".") && part !== ARCHIVE_DIR);

const _unhealthy = (state: WatchState, root: string, error: unknown) => {
  console.error(`Relations watcher stopped for ${root}, falling back to periodic checks:`, error);
  state.healthy = false;
};

export const watchingRelations = (): boolean =>
  Boolean(globalThis.__jottyRelationsWatch?.healthy);

export const stopWatchingRelations = () => {
  const state = globalThis.__jottyRelationsWatch;
  if (!state) return;
  state.watchers.forEach((watcher) => watcher.close());
  state.batcher.stop();
  globalThis.__jottyRelationsWatch = undefined;
};

export const watchRelations = (): boolean => {
  if (globalThis.__jottyRelationsWatch) return watchingRelations();

  const state: WatchState = {
    watchers: [],
    batcher: throttledBatch(refreshItemPaths, WATCH_FLUSH_MS),
    healthy: true,
  };
  globalThis.__jottyRelationsWatch = state;

  for (const root of itemTreeRoots()) {
    try {
      const watcher = fs.watch(root, { recursive: true, persistent: false }, (_event, filename) => {
        const name = filename?.toString();
        if (!name || _ignored(name)) return;
        state.batcher.add(path.join(root, name));
      });
      watcher.on("error", (error) => _unhealthy(state, root, error));
      state.watchers.push(watcher);
    } catch (error) {
      _unhealthy(state, root, error);
    }
  }

  return state.healthy;
};
