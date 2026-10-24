import fs from "fs/promises";
import { grepExtractFrontmatter } from "@/app/_utils/grep-utils";
import { mapPooled } from "./concurrency";
import { summaryMemo, type FileStamp } from "./summary-memo";

type Frontmatter = Record<string, unknown>;

const FRONTMATTER_MEMO_LIMIT = 100_000;
const FRONTMATTER_POOL = 64;

declare global {
  var __jottyFrontmatterMemo: ReturnType<typeof summaryMemo<Frontmatter | null>> | undefined;
}

const memo = (globalThis.__jottyFrontmatterMemo ??= summaryMemo<Frontmatter | null>(FRONTMATTER_MEMO_LIMIT));

export const frontmatterOf = async (
  filePath: string,
  stamp?: FileStamp,
): Promise<Frontmatter | null> => {
  const hit = stamp ? memo.recall(filePath, stamp) : undefined;
  if (hit !== undefined) return hit;
  const metadata = await grepExtractFrontmatter(filePath);
  return stamp ? memo.remember(filePath, stamp, metadata) : metadata;
};

export const currentFrontmatterOf = async (filePath: string): Promise<Frontmatter | null> => {
  const stats = await fs.stat(filePath).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") console.error("Could not stat for frontmatter:", filePath, error);
    return null;
  });
  return stats ? frontmatterOf(filePath, stats) : null;
};

export const fillFrontmatters = async (
  stamps: Map<string, FileStamp>,
  into: Map<string, Frontmatter>,
): Promise<void> => {
  await mapPooled(Array.from(stamps), FRONTMATTER_POOL, async ([filePath, stamp]) => {
    const metadata = await frontmatterOf(filePath, stamp);
    if (metadata) into.set(filePath, metadata);
  });
};
