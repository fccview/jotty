import { Modes } from "@/app/_types/enums";
import fs from "fs";
import path from "path";
import { CATEGORY_INFO_FILE, LEGACY_ORDER_FILE } from "@/app/_consts/sharing";

const store = new Map<string, unknown[]>();
const pending = new Map<string, Promise<unknown[]>>();
const watchers = new Map<string, fs.FSWatcher>();
const dirToKeys = new Map<string, Set<string>>();
const stamps = new Map<string, number>();

function drop(key: string) {
  store.delete(key);
  stamps.set(key, (stamps.get(key) || 0) + 1);
}

function invalidateDir(dir: string) {
  dirToKeys.get(dir)?.forEach(drop);
}

function startWatcher(dir: string) {
  if (watchers.has(dir)) return;

  try {
    const watcher = fs.watch(
      dir,
      { recursive: true, persistent: false },
      (_event, filename) => {
        if (!filename) return;
        if (
          filename.endsWith(".md") ||
          filename.endsWith(CATEGORY_INFO_FILE) ||
          filename.endsWith(LEGACY_ORDER_FILE)
        ) {
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

export async function getOrCompute<T>(
  key: string,
  dir: string,
  compute: () => Promise<T[]>,
): Promise<T[]> {
  if (store.has(key)) return [...(store.get(key)! as T[])];

  if (pending.has(key)) {
    const inflight = (await pending.get(key)!) as T[];
    return [...inflight];
  }

  registerKey(key, dir);
  startWatcher(dir);

  const promise = (async () => {
    const stamp = stamps.get(key) || 0;

    try {
      const result = await compute();

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

export function invalidateCached(key: string) {
  drop(key);
}

export function dropByPrefix(prefix: string) {
  const known = new Set([...store.keys(), ...pending.keys()]);

  known.forEach((key) => {
    if (key.startsWith(prefix)) drop(key);
  });
}

export function metaCacheKey(type: Modes, dir: string) {
  const abs = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
  return `${type}-meta:${abs}`;
}
