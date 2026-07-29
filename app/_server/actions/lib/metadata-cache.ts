import { Modes } from "@/app/_types/enums";
import fs from "fs";
import path from "path";
import { CATEGORY_INFO_FILE, LEGACY_ORDER_FILE } from "@/app/_consts/sharing";

const store = new Map<string, unknown[]>();
const pending = new Map<string, Promise<unknown[]>>();
const watchers = new Map<string, fs.FSWatcher>();
const dirToKeys = new Map<string, Set<string>>();

function invalidateDir(dir: string) {
  dirToKeys.get(dir)?.forEach((key) => store.delete(key));
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

    watcher.on("error", () => {
      watchers.delete(dir);
      dirToKeys.delete(dir);
    });

    watchers.set(dir, watcher);
  } catch {}
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

  const promise = (async () => {
    try {
      const result = await compute();
      store.set(key, result as unknown[]);
      registerKey(key, dir);
      startWatcher(dir);
      return result;
    } finally {
      pending.delete(key);
    }
  })();

  pending.set(key, promise as Promise<unknown[]>);
  return [...(await promise)];
}

export function invalidateCached(key: string) {
  store.delete(key);
}

export function metaCacheKey(type: Modes, dir: string) {
  const abs = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
  return `${type}-meta:${abs}`;
}
