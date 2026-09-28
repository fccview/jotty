export enum SearchModes {
  SMART = "smart",
  RANKED = "ranked",
  SUBSTRING = "substring",
}

export const DEFAULT_SEARCH_MODE = SearchModes.SMART;
export const SEARCH_HITS_PER_TYPE = 20;
export const SEARCH_SNIPPET_TOKENS = 12;
