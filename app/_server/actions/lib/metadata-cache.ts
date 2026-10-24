import { Modes } from "@/app/_types/enums";
import fs from "fs";
import path from "path";
import { CATEGORY_INFO_FILE, LEGACY_ORDER_FILE } from "@/app/_consts/sharing";

type Refresh = (paths: string[], current: unknown[]) => Promise<unknown[] | null>;

interface MetaCacheState {
  store: Map<string, unknown[]>;
  pending: Map<string, Promise<unknown[]>>;
  watchers: Map<string, fs.FSWatcher>;
  dirToKeys: Map<string, Set<string>>;
  stamps: Map<string, number>;
  refreshers?: Map<string, Refresh>;
  dirty?: Map<string, Set<string>>;
}

declare global {
  var __jottyMetaCache: MetaCacheState | undefined;
}

const state: MetaCacheState = (globalThis.__jottyMetaCache ??= {
  store: new Map(),
  pending: new Map(),
  watchers: new Map(),
  dirToKeys: new Map(),
  stamps: new Map(),
});
const refreshers: Map<string, Refresh> = (state.refreshers ??= new Map());
const dirty: Map<string, Set<string>> = (state.dirty ??= new Map());
const { store, pending, watchers, dirToKeys, stamps } = state;

const MARKDOWN = ".md";

function drop(key: string) {
  store.delete(key);
  dirty.delete(key);
  stamps.set(key, (stamps.get(key) || 0) + 1);
}

function invalidateDir(dir: string) {
  dirToKeys.get(dir)?.forEach(drop);
}

function touch(key: string, filePath: string) {
  if (pending.has(key) || !refreshers.has(key) || !store.has(key)) {
    drop(key);
    return;
  }
  const changed = dirty.get(key) || new Set<string>();
  changed.add(filePath);
  dirty.set(key, changed);
}

function touchFile(dir: string, filePath: string) {
  dirToKeys.get(dir)?.forEach((key) => touch(key, filePath));
}

function startWatcher(dir: string) {
  if (watchers.has(dir)) return;

  try {
    const watcher = fs.watch(
      dir,
      { recursive: true, persistent: false },
      (_event, filename) => {
        if (!filename) return;
        if (filename.endsWith(MARKDOWN)) {
          touchFile(dir, path.join(dir, filename));
        } else if (filename.endsWith(CATEGORY_INFO_FILE) || filename.endsWith(LEGACY_ORDER_FILE)) {
          invalidateDir(dir);
        }
      },
    );

    watcher.on("error", (error) => {
      console.error(`Metadata cache watcher failed for ${dir}:`, error);
      invalidateDir(dir);
      watchers.delete(dir);
      dirToKeys.delete(dir);
    });

    watchers.set(dir, watcher);
  } catch (error) {
    console.error(`Could not watch ${dir} for metadata changes:`, error);
  }
}

function registerKey(key: string, dir: string) {
  if (!dirToKeys.has(dir)) dirToKeys.set(dir, new Set());
  dirToKeys.get(dir)!.add(key);
}

const _patched = async <T>(key: string, base: T[] | undefined, paths: string[]): Promise<T[] | null> => {
  const refresh = refreshers.get(key);
  if (!base || !paths.length || !refresh) return null;
  try {
    return (await refresh(paths, base)) as T[] | null;
  } catch (error) {
    console.error(`Could not patch cached listing ${key}, reading it again:`, error);
    return null;
  }
};

export async function getOrCompute<T>(
  key: string,
  dir: string,
  compute: () => Promise<T[]>,
  refresh?: (paths: string[], current: T[]) => Promise<T[] | null>,
): Promise<T[]> {
  if (refresh) refreshers.set(key, refresh as Refresh);
  const changed = dirty.get(key);
  if (store.has(key) && !changed?.size) return [...(store.get(key)! as T[])];

  if (pending.has(key)) {
    const inflight = (await pending.get(key)!) as T[];
    return [...inflight];
  }

  registerKey(key, dir);
  startWatcher(dir);

  const base = store.get(key) as T[] | undefined;
  const paths = changed ? Array.from(changed) : [];
  dirty.delete(key);

  const promise = (async () => {
    const stamp = stamps.get(key) || 0;

    try {
      const result = (await _patched(key, base, paths)) ?? (await compute());

      if ((stamps.get(key) || 0) === stamp) {
        store.set(key, result as unknown[]);
      }

      return result;
    } finally {
      pending.delete(key);
    }
  })();

  pending.set(key, promise as Promise<unknown[]>);
  return [...(await promise)];
}

export function invalidatePath(target: string) {
  const abs = path.resolve(target);
  dirToKeys.forEach((_, dir) => {
    if (abs.endsWith(MARKDOWN) && abs.startsWith(dir + path.sep)) {
      touchFile(dir, abs);
    } else if (abs === dir || abs.startsWith(dir + path.sep) || dir.startsWith(abs + path.sep)) {
      invalidateDir(dir);
    }
  });
}

export function touchCached(key: string, paths: string[]) {
  paths.forEach((filePath) => touch(key, filePath));
}

export function invalidateCached(key: string) {
  drop(key);
}

export function dropByPrefix(prefix: string) {
  const known = new Set<string>();

  store.forEach((_, key) => known.add(key));
  pending.forEach((_, key) => known.add(key));

  known.forEach((key) => {
    if (key.startsWith(prefix)) drop(key);
  });
}

enum CacheFlavour {
  META = "meta",
  SUMMARY = "summary",
}

const cacheKeyOf = (flavour: CacheFlavour, type: Modes, dir: string) => {
  const abs = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
  return `${type}-${flavour}:${abs}`;
};

export function metaCacheKey(type: Modes, dir: string) {
  return cacheKeyOf(CacheFlavour.META, type, dir);
}

export function summaryCacheKey(type: Modes, dir: string) {
  return cacheKeyOf(CacheFlavour.SUMMARY, type, dir);
}

export function cachedListingsOf(dir: string): unknown[][] {
  return Object.values(Modes).flatMap((type) =>
    [metaCacheKey(type, dir), summaryCacheKey(type, dir)].flatMap((key) => {
      const held = store.get(key);
      return held ? [held] : [];
    }),
  );
}
