const MEMO_LIMIT = 20000;
const UNKNOWN_STAMP = -1;
const STAT_FIELDS = 4;

export const STAT_PRINTF = "%p|%W@|%T@|%s|%C@\\n";

export interface FileStamp {
  mtime: Date;
  size?: number;
  ctime?: Date;
}

export interface StatLine extends FileStamp {
  birthtime: Date;
}

const stampKey = ({ mtime, size, ctime }: FileStamp): string =>
  [mtime.getTime(), size ?? UNKNOWN_STAMP, ctime?.getTime() ?? UNKNOWN_STAMP].join(":");

const secondsToDate = (value: string): Date => new Date(parseFloat(value) * 1000);

export const parseStatLine = (line: string): [string, StatLine] | null => {
  const parts = line.split("|");
  if (parts.length < STAT_FIELDS + 1) return null;
  const [birth, modified, size, changed] = parts.slice(-STAT_FIELDS);
  const filePath = parts.slice(0, -STAT_FIELDS).join("|");
  const sizeNum = Number(size);
  if (!filePath || !birth || !modified || !changed || !Number.isFinite(sizeNum)) return null;
  return [
    filePath,
    {
      birthtime: secondsToDate(birth),
      mtime: secondsToDate(modified),
      size: sizeNum,
      ctime: secondsToDate(changed),
    },
  ];
};

export const summaryMemo = <T>(limit: number = MEMO_LIMIT) => {
  const memo = new Map<string, { stamp: string; value: T }>();

  const recall = (filePath: string, stats: FileStamp): T | undefined => {
    const hit = memo.get(filePath);
    if (!hit) return undefined;
    memo.delete(filePath);
    if (hit.stamp !== stampKey(stats)) return undefined;
    memo.set(filePath, hit);
    return hit.value;
  };

  const remember = (filePath: string, stats: FileStamp, value: T): T => {
    memo.delete(filePath);
    memo.set(filePath, { stamp: stampKey(stats), value });
    if (memo.size > limit) {
      const oldest = memo.keys().next().value;
      if (oldest !== undefined) memo.delete(oldest);
    }
    return value;
  };

  return { recall, remember };
};
