import path from "path";

const MEMO_LIMIT = 20000;
const UNKNOWN_STAMP = -1;

export interface FileStamp {
  mtime: Date;
  size?: number;
  ctime?: Date;
}

export const stampKey = ({ mtime, size, ctime }: FileStamp): string =>
  [mtime.getTime(), size ?? UNKNOWN_STAMP, ctime?.getTime() ?? UNKNOWN_STAMP].join(":");

export const summaryMemo = <T>(limit: number = MEMO_LIMIT) => {
  const memo = new Map<string, { stamp: string; value: T }>();

  const recall = (given: string, stats: FileStamp): T | undefined => {
    const filePath = path.resolve(given);
    const hit = memo.get(filePath);
    if (!hit) return undefined;
    memo.delete(filePath);
    if (hit.stamp !== stampKey(stats)) return undefined;
    memo.set(filePath, hit);
    return hit.value;
  };

  const remember = (given: string, stats: FileStamp, value: T): T => {
    const filePath = path.resolve(given);
    memo.delete(filePath);
    memo.set(filePath, { stamp: stampKey(stats), value });
    if (memo.size > limit) {
      const oldest = memo.keys().next().value;
      if (oldest !== undefined) memo.delete(oldest);
    }
    return value;
  };

  const stampOf = (filePath: string): string | undefined => memo.get(path.resolve(filePath))?.stamp;

  const pathsUnder = (dir: string): string[] => {
    const prefix = path.resolve(dir) + path.sep;
    return Array.from(memo.keys()).filter((filePath) => filePath.startsWith(prefix));
  };

  return { recall, remember, stampOf, pathsUnder };
};
