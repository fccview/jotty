import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { search } from "@/app/_server/actions/search";
import { grepSearchContent, grepExtractFrontmatter } from "@/app/_utils/grep-utils";
import { NOTES_DIR } from "@/app/_consts/files";
import { CHECKLISTS_FOLDER } from "@/app/_consts/checklists";
import path from "path";

export const dynamic = "force-dynamic";

const QUERY_MIN_LEN = 2;
const RESULT_SLICE = 20;

const cleanMatch = (line: string) =>
  line
    .replace(/^---$/, "")
    .replace(/^- \[[x ]\]\s*/i, "")
    .replace(/\s*\|.*$/, "")
    .replace(/^#+\s*/, "")
    .trim();

export async function GET(request: NextRequest) {
  return withApiAuth(request, async (user) => {
    try {
      const { searchParams } = new URL(request.url);
      const query = searchParams.get("q") || "";
      const typeFilter = searchParams.get("type");

      if (query.trim().length < QUERY_MIN_LEN) {
        return NextResponse.json(
          { error: `Query must be at least ${QUERY_MIN_LEN} characters` },
          { status: 400 },
        );
      }

      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const notesDir = NOTES_DIR(user.username);
      const checklistsDir = path.join(process.cwd(), "data", CHECKLISTS_FOLDER, user.username);

      const [rawNotes, rawChecklists] = await Promise.all([
        typeFilter === "checklist" ? Promise.resolve([]) : grepSearchContent(notesDir, escaped).catch(() => []),
        typeFilter === "note" ? Promise.resolve([]) : grepSearchContent(checklistsDir, escaped).catch(() => []),
      ]);

      const toResult = async (
        hits: { filePath: string; id: string; category: string; matchLine: string }[],
        type: "note" | "checklist",
      ) =>
        Promise.all(
          hits.slice(0, RESULT_SLICE).map(async (hit) => {
            const meta = await grepExtractFrontmatter(hit.filePath);
            const title = (meta?.title as string) || hit.id;
            const cleaned = cleanMatch(hit.matchLine);
            return {
              id: hit.id,
              uuid: meta?.uuid as string | undefined,
              type,
              title,
              category: hit.category || "Uncategorized",
              excerpt: cleaned && cleaned.toLowerCase() !== title.toLowerCase() ? cleaned : undefined,
            };
          }),
        );

      const [notes, checklists] = await Promise.all([
        toResult(rawNotes, "note"),
        toResult(rawChecklists, "checklist"),
      ]);

      return NextResponse.json({
        query,
        results: [...notes, ...checklists],
        total: notes.length + checklists.length,
      });
    } catch (error) {
      console.error("Search API error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
}
