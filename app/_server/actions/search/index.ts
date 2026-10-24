"use server";

import { getCurrentUser } from "@/app/_server/actions/users";
import { DEFAULT_SEARCH_MODE } from "@/app/_consts/search";
import { SEARCH_MIN_LEN } from "@/app/_schemas/api/discovery";
import { searchItems } from "./engine";

export interface SearchResult {
  id: string;
  uuid?: string;
  title: string;
  type: "note" | "checklist";
  category: string;
  content?: string;
}

interface SearchResponse {
  success: boolean;
  data: SearchResult[];
  indexing?: boolean;
}

export const search = async (query: string): Promise<SearchResponse> => {
  if (!query || query.trim().length < SEARCH_MIN_LEN) {
    return { success: true, data: [] };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { success: false, data: [] };
  }

  const { hits, indexing } = await searchItems(user.username, query, {
    mode: user.searchMode || DEFAULT_SEARCH_MODE,
  });

  return {
    success: true,
    indexing,
    data: hits.map((hit) => ({
      id: hit.slug,
      uuid: hit.uuid,
      title: hit.title,
      type: hit.type,
      category: hit.category,
      content: hit.excerpt,
    })),
  };
};
