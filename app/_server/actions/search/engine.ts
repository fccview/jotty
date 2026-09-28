import path from "path";
import { grepExtractFrontmatter, grepSearchContent } from "@/app/_utils/grep-utils";
import { CHECKLISTS_DIR, NOTES_DIR } from "@/app/_consts/files";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { RelationsStatus } from "@/app/_consts/relations";
import { SEARCH_HITS_PER_TYPE, SearchModes } from "@/app/_consts/search";
import { ItemTypes } from "@/app/_types/enums";
import { ensureRelations } from "@/app/_server/actions/relations/indexer";
import { rankedSearch } from "@/app/_server/actions/relations/search";

export interface SearchHit {
  uuid?: string;
  slug: string;
  type: ItemTypes;
  title: string;
  category: string;
  excerpt?: string;
}

export interface SearchOutcome {
  hits: SearchHit[];
  indexing: boolean;
}

interface SearchOptions {
  type?: ItemTypes;
  mode: SearchModes;
}

const DIRS: Record<ItemTypes, (username: string) => string> = {
  [ItemTypes.NOTE]: NOTES_DIR,
  [ItemTypes.CHECKLIST]: CHECKLISTS_DIR,
};

const _cleanMatch = (line: string) =>
  line
    .replace(/^---$/, "")
    .replace(/^- \[[x ]\]\s*/i, "")
    .replace(/\s*\|.*$/, "")
    .replace(/^#+\s*/, "")
    .trim();

const _grepHits = async (
  username: string,
  query: string,
  type: ItemTypes,
  skip: Set<string>,
  limit: number,
): Promise<SearchHit[]> => {
  let found: Awaited<ReturnType<typeof grepSearchContent>> = [];
  try {
    found = await grepSearchContent(DIRS[type](username), query);
  } catch (error) {
    console.error(`Search grep failed for ${type}:`, error);
  }

  const fresh = found.filter((hit) => !skip.has(path.resolve(hit.filePath))).slice(0, limit);
  return Promise.all(
    fresh.map(async (hit) => {
      const meta = await grepExtractFrontmatter(hit.filePath);
      const title = (meta?.title as string) || hit.id;
      const cleaned = _cleanMatch(hit.matchLine);
      return {
        uuid: meta?.uuid as string | undefined,
        slug: hit.id,
        type,
        title,
        category: hit.category || UNCATEGORIZED,
        excerpt: cleaned && cleaned.toLowerCase() !== title.toLowerCase() ? cleaned : undefined,
      };
    }),
  );
};

interface TypeHits {
  ranked: { hit: SearchHit; rank: number }[];
  fill: SearchHit[];
}

const _searchType = async (
  username: string,
  query: string,
  type: ItemTypes,
  mode: SearchModes,
  ready: boolean,
): Promise<TypeHits> => {
  if (mode === SearchModes.SUBSTRING || (mode === SearchModes.SMART && !ready)) {
    return { ranked: [], fill: await _grepHits(username, query, type, new Set(), SEARCH_HITS_PER_TYPE) };
  }
  if (!ready) return { ranked: [], fill: [] };

  const found = rankedSearch(username, query, type, SEARCH_HITS_PER_TYPE);
  const ranked = found.map(({ path: _path, rank, ...hit }) => ({ hit, rank }));
  if (mode === SearchModes.RANKED || found.length >= SEARCH_HITS_PER_TYPE) return { ranked, fill: [] };

  const seen = new Set(found.map((hit) => hit.path));
  const room = SEARCH_HITS_PER_TYPE - found.length;
  return { ranked, fill: await _grepHits(username, query, type, seen, room) };
};

export const searchItems = async (
  username: string,
  query: string,
  { type, mode }: SearchOptions,
): Promise<SearchOutcome> => {
  const ready = mode === SearchModes.SUBSTRING || ensureRelations() === RelationsStatus.READY;
  const types = type ? [type] : [ItemTypes.NOTE, ItemTypes.CHECKLIST];
  const perType = await Promise.all(
    types.map((each) => _searchType(username, query, each, mode, ready)),
  );

  const ranked = perType
    .flatMap((hits) => hits.ranked)
    .sort((a, b) => a.rank - b.rank)
    .map((entry) => entry.hit);
  const fill = perType.flatMap((hits) => hits.fill);
  return { hits: [...ranked, ...fill], indexing: !ready && mode === SearchModes.RANKED };
};
