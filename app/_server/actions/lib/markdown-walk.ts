import type { Stats } from "fs";
import fs from "fs/promises";
import path from "path";
import { skippedDirs } from "@/app/_consts/files";

const MARKDOWN = ".md";
const STAT_BATCH = 256;
const MISSING = "ENOENT";

const _isMissing = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException)?.code === MISSING;

const _breather = () => new Promise<void>((resolve) => setImmediate(resolve));

export const markdownUnder = async (
  dir: string,
  allowArchived = false,
): Promise<string[]> => {
  const skipped = new Set(skippedDirs(allowArchived));
  const root = path.resolve(dir);
  const names = (await fs.readdir(root, { recursive: true })) as string[];

  return names
    .filter(
      (name) =>
        name.endsWith(MARKDOWN) &&
        !name.split(path.sep).slice(0, -1).some((part) => skipped.has(part)),
    )
    .map((name) => path.join(root, name));
};

const _stat = async (filePath: string): Promise<Stats | null> => {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile() ? stats : null;
  } catch (error) {
    if (!_isMissing(error)) console.warn(`Could not stat ${filePath}:`, error);
    return null;
  }
};

export const statMany = async (paths: string[]): Promise<Map<string, Stats>> => {
  const found = new Map<string, Stats>();

  for (let start = 0; start < paths.length; start += STAT_BATCH) {
    const slice = paths.slice(start, start + STAT_BATCH);
    const stats = await Promise.all(slice.map(_stat));
    stats.forEach((entry, index) => entry && found.set(slice[index], entry));
    await _breather();
  }

  return found;
};

export const statMarkdown = async (
  dir: string,
  allowArchived = false,
): Promise<Map<string, Stats> | null> => {
  try {
    return await statMany(await markdownUnder(dir, allowArchived));
  } catch (error) {
    if (!_isMissing(error)) console.error(`Could not walk ${dir} for markdown files:`, error);
    return null;
  }
};
