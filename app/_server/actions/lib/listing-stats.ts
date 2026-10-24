import fs from "fs/promises";
import { hiddenFindFilter } from "@/app/_consts/files";
import { boxedShell } from "@/app/_utils/shell-utils";
import type { FileStatsEntry } from "@/app/_server/actions/file";

const LIST_BUFFER = 10 * 1024 * 1024;
const STAT_BATCH = 4000;
const MISSING = "ENOENT";

const _listScript = (allowArchived: boolean): string =>
  `find "$1" -name "*.md" ${hiddenFindFilter(allowArchived)} -type f || [ $? -eq 1 ]`;

const _stat = async (filePath: string): Promise<[string, FileStatsEntry] | null> => {
  try {
    const { birthtime, mtime, size, ctime } = await fs.stat(filePath);
    return [filePath, { birthtime, mtime, size, ctime }];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== MISSING) {
      console.warn(`Could not stat ${filePath} for the listing:`, error);
    }
    return null;
  }
};

export const listingStats = async (
  dir: string,
  allowArchived = false,
): Promise<Map<string, FileStatsEntry>> => {
  const stats = new Map<string, FileStatsEntry>();
  let paths: string[];

  try {
    const out = await boxedShell(_listScript(allowArchived), [dir], { maxBuffer: LIST_BUFFER });
    paths = out.split("\n").filter(Boolean);
  } catch (error) {
    console.warn(`Could not list ${dir} for the listing stats:`, error);
    return stats;
  }

  for (let start = 0; start < paths.length; start += STAT_BATCH) {
    const batch = await Promise.all(paths.slice(start, start + STAT_BATCH).map(_stat));
    batch.forEach((entry) => entry && stats.set(entry[0], entry[1]));
  }

  return stats;
};
