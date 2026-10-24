import { statSync } from "fs";
import fs from "fs/promises";
import path from "path";
import { skippedDirs } from "@/app/_consts/files";
import { invalidateCached, touchCached } from "./metadata-cache";
import { stampKey } from "./summary-memo";

const STALE_REBUILD_AT = 500;
const STAT_CHUNK = 2000;
const MARKDOWN = ".md";

export interface StampBook {
  stampOf: (filePath: string) => string | undefined;
  pathsUnder: (dir: string) => string[];
}

const _breather = () => new Promise<void>((resolve) => setImmediate(resolve));

const _stampsOf = async (root: string, files: string[]): Promise<Map<string, string>> => {
  const found = new Map<string, string>();
  for (let start = 0; start < files.length; start += STAT_CHUNK) {
    files.slice(start, start + STAT_CHUNK).forEach((name) => {
      const filePath = path.join(root, name);
      const stats = statSync(filePath, { throwIfNoEntry: false });
      if (stats?.isFile()) found.set(filePath, stampKey(stats));
    });
    await _breather();
  }
  return found;
};

const _onDisk = async (dir: string): Promise<Map<string, string> | null> => {
  try {
    const skipped = new Set(skippedDirs());
    const root = path.resolve(dir);
    const names = (await fs.readdir(root, { recursive: true })) as string[];
    const files = names.filter(
      (name) => name.endsWith(MARKDOWN) && !name.split(path.sep).slice(0, -1).some((part) => skipped.has(part)),
    );
    return await _stampsOf(root, files);
  } catch (error) {
    console.error(`Could not check ${dir} against its cached listing:`, error);
    return null;
  }
};

export const verifyListing = async (key: string, dir: string, book: StampBook): Promise<void> => {
  const found = await _onDisk(dir);
  if (!found) {
    invalidateCached(key);
    return;
  }
  const stale: string[] = [];
  found.forEach((stamp, filePath) => {
    if (book.stampOf(filePath) !== stamp) stale.push(filePath);
  });
  book.pathsUnder(dir).forEach((filePath) => {
    if (!found.has(filePath)) stale.push(filePath);
  });
  if (stale.length > STALE_REBUILD_AT) invalidateCached(key);
  else if (stale.length) touchCached(key, stale);
};
