"use server";

import { getCurrentUser } from "@/app/_server/actions/users";
import { NOTES_DIR } from "@/app/_consts/files";
import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";
import { grepSearchContent, grepExtractFrontmatter } from "@/app/_utils/grep-utils";
import { ItemTypes } from "@/app/_types/enums";
import path from "path";

export interface SearchResult {
  id: string;
  uuid?: string;
  title: string;
  type: "note" | "checklist";
  category: string;
  content?: string;
}

export const search = async (query: string): Promise<{ success: boolean; data: SearchResult[] }> => {
  if (!query || query.trim().length < 2) {
    return { success: true, data: [] };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { success: false, data: [] };
  }

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const notesDir = NOTES_DIR(user.username);
  const checklistsDir = path.join(process.cwd(), "data", CHECKLISTS_FOLDER, user.username);

  const [noteResults, checklistResults] = await Promise.all([
    grepSearchContent(notesDir, escapedQuery).catch(() => []),
    grepSearchContent(checklistsDir, escapedQuery).catch(() => []),
  ]);

  const cleanMatchLine = (line: string): string => {
    let cleaned = line
      .replace(/^---$/, "")
      .replace(/^- \[[x ]\]\s*/i, "")
      .replace(/\s*\|.*$/, "")
      .replace(/^#+\s*/, "")
      .trim();
    return cleaned;
  };

  const processResults = async (
    results: { filePath: string; id: string; category: string; matchLine: string }[],
    type: "note" | "checklist"
  ): Promise<SearchResult[]> => {
    return Promise.all(
      results.slice(0, 20).map(async (result) => {
        const metadata = await grepExtractFrontmatter(result.filePath);
        const title = (metadata?.title as string) || result.id;
        const cleaned = cleanMatchLine(result.matchLine);
        const content = cleaned && cleaned.toLowerCase() !== title.toLowerCase()
          ? cleaned
          : undefined;
        return {
          id: result.id,
          uuid: metadata?.uuid as string | undefined,
          title,
          type,
          category: result.category || "Uncategorized",
          content,
        };
      })
    );
  };

  const [notes, checklists] = await Promise.all([
    processResults(noteResults, "note"),
    processResults(checklistResults, "checklist"),
  ]);

  return { success: true, data: [...notes, ...checklists] };
};
