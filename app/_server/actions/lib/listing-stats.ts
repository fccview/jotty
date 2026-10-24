import type { FileStatsEntry } from "@/app/_server/actions/file";
import { statMarkdown } from "./markdown-walk";

export const listingStats = async (
  dir: string,
  allowArchived = false,
): Promise<Map<string, FileStatsEntry>> => {
  const stats = new Map<string, FileStatsEntry>();
  const found = await statMarkdown(dir, allowArchived);

  found?.forEach(({ birthtime, mtime, size, ctime }, filePath) =>
    stats.set(filePath, { birthtime, mtime, size, ctime }),
  );

  return stats;
};
