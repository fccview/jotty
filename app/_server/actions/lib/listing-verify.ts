import { invalidateCached, touchCached } from "./metadata-cache";
import { stampKey } from "./summary-memo";
import { statMarkdown } from "./markdown-walk";

const STALE_REBUILD_AT = 500;

export interface StampBook {
  stampOf: (filePath: string) => string | undefined;
  pathsUnder: (dir: string) => string[];
}

const _onDisk = async (dir: string): Promise<Map<string, string> | null> => {
  const stats = await statMarkdown(dir);
  if (!stats) return null;

  const found = new Map<string, string>();
  stats.forEach((entry, filePath) => found.set(filePath, stampKey(entry)));
  return found;
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
