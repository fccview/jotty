import fs from "fs/promises";
import path from "path";
import { readOrderFile } from "@/app/_server/actions/file";

interface Patchable {
  id?: string;
  uuid?: string;
  category?: string;
}

const MARKDOWN = ".md";

const _exists = (filePath: string): Promise<boolean> =>
  fs.stat(filePath).then(
    () => true,
    () => false,
  );

const _place = async <T extends Patchable>(next: T[], fresh: T, category: string, folderDir: string) => {
  const block = next.flatMap((item, index) => ((item.category || "") === category ? [index] : []));
  if (!block.length) return false;

  const order = await readOrderFile(folderDir);
  const rank = new Map((order?.items || []).map((uuid: string, index: number) => [uuid, index]));
  const rankOf = (item: Patchable) => (item.uuid ? rank.get(item.uuid) : undefined);
  const freshRank = rankOf(fresh);

  const before = block.find((index) => {
    const itemRank = rankOf(next[index]);
    if (freshRank !== undefined) return itemRank === undefined || itemRank > freshRank;
    return itemRank === undefined && (next[index].id || "").localeCompare(fresh.id || "") > 0;
  });

  next.splice(before ?? block[block.length - 1] + 1, 0, fresh);
  return true;
};

export const listingPatcher =
  <T extends Patchable>(
    dir: string,
    skipped: string[],
    readEntry: (filePath: string, category: string) => Promise<T | null>,
  ) =>
  async (paths: string[], current: T[]): Promise<T[] | null> => {
    const next = [...current];

    for (const filePath of paths) {
      const rel = path.relative(dir, filePath);
      if (!rel || rel.startsWith("..") || path.isAbsolute(rel) || !rel.endsWith(MARKDOWN)) return null;

      const folders = rel.split(path.sep).slice(0, -1);
      if (folders.some((folder) => skipped.includes(folder))) continue;

      const category = folders.join("/");
      const id = path.basename(rel, MARKDOWN);
      const at = next.findIndex((item) => item.id === id && (item.category || "") === category);

      if (!(await _exists(filePath))) {
        if (at >= 0) next.splice(at, 1);
        continue;
      }

      const fresh = await readEntry(filePath, category);
      if (!fresh) return null;

      if (at >= 0) {
        if (fresh.uuid !== next[at].uuid) return null;
        next[at] = fresh;
      } else if (!(await _place(next, fresh, category, path.dirname(filePath)))) {
        return null;
      }
    }

    return next;
  };
