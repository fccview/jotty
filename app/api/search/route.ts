import { NextResponse } from "next/server";
import { defineRoute } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import {
  SEARCH_MIN_LEN,
  searchParamsSchema,
  searchResultsSchema,
} from "@/app/_schemas/api/discovery";
import { DEFAULT_SEARCH_MODE, SEARCH_HITS_PER_TYPE } from "@/app/_consts/search";
import { searchItems } from "@/app/_server/actions/search/engine";

export const dynamic = "force-dynamic";

export const GET = defineRoute(
  {
    id: "search",
    method: HttpMethod.GET,
    path: "/search",
    tag: ApiTag.DISCOVERY,
    summary: "Search notes and checklists",
    description: `Full-text search across your own notes and checklists. The query needs at least ${SEARCH_MIN_LEN} characters and each type returns at most ${SEARCH_HITS_PER_TYPE} hits. By default the best matches come first, finding the words in any order, and exact-text matches fill the rest.`,
    query: searchParamsSchema,
    responses: {
      200: { description: "Matches", schema: searchResultsSchema },
      400: ERRORS[400],
      401: ERRORS[401],
      500: ERRORS[500],
    },
  },
  async ({ user, query }) => {
    const { hits, indexing } = await searchItems(user.username, query.q, {
      type: query.type,
      mode: query.match || user.searchMode || DEFAULT_SEARCH_MODE,
    });

    return NextResponse.json({
      query: query.q,
      results: hits.map((hit) => ({ ...hit, id: hit.slug })),
      total: hits.length,
      ...(indexing && { indexing }),
    });
  },
);
