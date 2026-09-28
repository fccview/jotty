import { SHARED_WITH_KEY } from "@/app/_consts/sharing";

export type MetaCache = Map<string, Record<string, unknown>>;

const GREP_LINE = /^(.*?):(\d+):(.*)$/;
const LIST_ITEM = /^\s+-\s+/;
const FENCE = "---";
const LIST_KEYS = ["tags", SHARED_WITH_KEY];

interface FileScan {
  entry: Record<string, unknown>;
  closed: boolean;
  listKey: string;
  lastLine: number;
}

export const metaGrep = (keys: string[]): string =>
  `grep -rnE "^(${keys.join("|")}):|^[[:space:]]+- |^---$" "$1"`;

const _inlineList = (value: string): string[] =>
  value
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const _readKey = (entry: Record<string, unknown>, key: string, value: string): boolean => {
  if (LIST_KEYS.includes(key) && value === "") {
    entry[key] = [];
    return true;
  }
  if (key === "tags") entry.tags = _inlineList(value);
  else if (key === "encrypted") entry.encrypted = value === "true";
  else entry[key] = value.replace(/^["']|["']$/g, "");
  return false;
};

export const scanFrontmatter = (grepOut: string, cache: MetaCache): void => {
  const scans = new Map<string, FileScan>();

  for (const line of grepOut.split("\n")) {
    const match = line.match(GREP_LINE);
    if (!match) continue;
    const [, filePath, lineText, rest] = match;
    const lineNo = Number(lineText);
    const scan = scans.get(filePath);

    if (rest.trim() === FENCE) {
      if (!scan && lineNo === 1) scans.set(filePath, { entry: {}, closed: false, listKey: "", lastLine: 1 });
      else if (scan && !scan.closed) {
        scan.closed = true;
        cache.set(filePath, { ...cache.get(filePath), ...scan.entry });
      }
      continue;
    }
    if (!scan || scan.closed) continue;

    if (LIST_ITEM.test(rest)) {
      const item = rest.replace(LIST_ITEM, "").trim();
      if (scan.listKey && lineNo === scan.lastLine + 1 && item) {
        const list = scan.entry[scan.listKey];
        if (Array.isArray(list)) list.push(item);
        scan.lastLine = lineNo;
      } else {
        scan.listKey = "";
      }
      continue;
    }

    scan.listKey = "";
    const colon = rest.indexOf(":");
    if (colon === -1) continue;
    const key = rest.slice(0, colon);
    const opensList = _readKey(scan.entry, key, rest.slice(colon + 1).trim());
    if (opensList) {
      scan.listKey = key;
      scan.lastLine = lineNo;
    }
  }
};
