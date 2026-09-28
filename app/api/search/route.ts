import { NextResponse } from "next/server";
import {
  GrepSearchResult,
  grepExtractFrontmatter,
  grepSearchContent,
} from "@/app/_utils/grep-utils";
import { defineRoute } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import {
  SEARCH_MIN_LEN,
  searchParamsSchema,
  searchResultsSchema,
} from "@/app/_schemas/api/discovery";
import { ItemTypes } from "@/app/_types/enums";
import { CHECKLISTS_DIR, NOTES_DIR } from "@/app/_consts/files";
import { UNCATEGORIZED } from "@/app/_consts/notes";

export const dynamic = "force-dynamic";

const RESULT_SLICE = 20;

const _cleanMatch = (line: string) =>
  line
    .replace(/^---$/, "")
    .replace(/^- \[[x ]\]\s*/i, "")
    .replace(/\s*\|.*$/, "")
    .replace(/^#+\s*/, "")
    .trim();

const _escape = (query: string) => query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const _grep = async (dir: string, pattern: string, wanted: boolean) => {
  if (!wanted) return [];
  try {
    return await grepSearchContent(dir, pattern);
  } catch (error) {
    console.error(`Search grep failed in ${dir}:`, error);
    return [];
  }
};

const _toHits = (hits: GrepSearchResult[], type: ItemTypes) =>
  Promise.all(
    hits.slice(0, RESULT_SLICE).map(async (hit) => {
      const meta = await grepExtractFrontmatter(hit.filePath);
      const title = (meta?.title as string) || hit.id;
      const cleaned = _cleanMatch(hit.matchLine);
      return {
        uuid: meta?.uuid as string | undefined,
        slug: hit.id,
        id: hit.id,
        type,
        title,
        category: hit.category || UNCATEGORIZED,
        excerpt: cleaned && cleaned.toLowerCase() !== title.toLowerCase() ? cleaned : undefined,
      };
    }),
  );

export const GET = defineRoute(
  {
    id: "search",
    method: HttpMethod.GET,
    path: "/search",
    tag: ApiTag.DISCOVERY,
    summary: "Search notes and checklists",
    description: `Full-text search across your own notes and checklists. The query needs at least ${SEARCH_MIN_LEN} characters and each type returns at most ${RESULT_SLICE} hits.`,
    query: searchParamsSchema,
    responses: {
      200: { description: "Matches", schema: searchResultsSchema },
      400: ERRORS[400],
      401: ERRORS[401],
      500: ERRORS[500],
    },
  },
  async ({ user, query }) => {
    const pattern = _escape(query.q);

    const [rawNotes, rawChecklists] = await Promise.all([
      _grep(NOTES_DIR(user.username), pattern, query.type !== ItemTypes.CHECKLIST),
      _grep(CHECKLISTS_DIR(user.username), pattern, query.type !== ItemTypes.NOTE),
    ]);

    const [notes, checklists] = await Promise.all([
      _toHits(rawNotes, ItemTypes.NOTE),
      _toHits(rawChecklists, ItemTypes.CHECKLIST),
    ]);

    return NextResponse.json({
      query: query.q,
      results: [...notes, ...checklists],
      total: notes.length + checklists.length,
    });
  },
);
