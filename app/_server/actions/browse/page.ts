import type { BrowsePage, BrowseQuery, Checklist, Note, Result, SanitisedUser } from "@/app/_types";
import { isKanbanType } from "@/app/_types/enums";
import {
  BOARD_FILTERS,
  BodyCookie,
  BrowseScope,
  BrowseSort,
  CHECKLIST_FILTERS,
  DEFAULT_ITEMS_PER_PAGE,
  ListFilter,
  NOTE_FILTERS,
  NoteFilter,
  PER_PAGE_OPTIONS,
} from "@/app/_consts/browse";
import {
  browseResults,
  inCategories,
  matchesListFilter,
  matchesNoteFilter,
  noteLimitFor,
  pinKeysOf,
} from "@/app/_utils/browse-utils";
import { listSummaryOf } from "@/app/_utils/browse/list-summary-utils";
import { isNoteEncrypted } from "@/app/_utils/note-display-utils";
import { getCurrentUser } from "@/app/_server/actions/users";
import { getUserNotes } from "@/app/_server/actions/note/queries";
import { bodiedNote, unlistedNote } from "@/app/_server/actions/note/bodies";
import type { ListedNote } from "@/app/_server/actions/note/readers";
import { mapPooled } from "@/app/_server/actions/lib/concurrency";
import { getUserChecklists } from "@/app/_server/actions/checklist/queries";

type Item = Note | Checklist;

const FILTERS: Record<BrowseScope, readonly string[]> = {
  [BrowseScope.NOTES]: NOTE_FILTERS,
  [BrowseScope.CHECKLISTS]: CHECKLIST_FILTERS,
  [BrowseScope.BOARDS]: BOARD_FILTERS,
};

const DEFAULT_FILTER = "all";
const BODY_PAGE: Record<BodyCookie, number> = {
  [BodyCookie.ON]: Number.MAX_SAFE_INTEGER,
  [BodyCookie.SELECTED]: 1,
  [BodyCookie.OFF]: 0,
};
const BODY_READERS = 16;

export const isBrowseScope = (scope: unknown): scope is BrowseScope =>
  Object.values(BrowseScope).some((each) => each === scope);

export const defaultFilterOf = (scope: BrowseScope, user: SanitisedUser | null): string => {
  if (scope === BrowseScope.NOTES) return user?.defaultNoteFilter || DEFAULT_FILTER;
  if (scope === BrowseScope.CHECKLISTS) return user?.defaultChecklistFilter || DEFAULT_FILTER;
  return DEFAULT_FILTER;
};

export const browseQueryOf = (scope: BrowseScope, raw: unknown, fallback: string): BrowseQuery => {
  const given = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const filters = FILTERS[scope];
  const page = Number(given.page);
  const perPage = Number(given.perPage);
  return {
    filter: typeof given.filter === "string" && filters.includes(given.filter) ? given.filter : fallback,
    categories: Array.isArray(given.categories)
      ? given.categories.filter((entry): entry is string => typeof entry === "string")
      : [],
    recursive: given.recursive === true,
    sort: Object.values(BrowseSort).find((sort) => sort === given.sort) || BrowseSort.UPDATED,
    perPage: PER_PAGE_OPTIONS.includes(perPage) ? perPage : DEFAULT_ITEMS_PER_PAGE,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
};

const _listing = async (scope: BrowseScope, username: string): Promise<Item[]> => {
  if (scope === BrowseScope.NOTES) {
    const notes = await getUserNotes({ username, summarize: true, keepSources: true });
    return notes.success ? ((notes.data || []) as Note[]) : [];
  }
  const lists = await getUserChecklists({ username, summarize: true });
  const all = lists.success ? ((lists.data || []) as Checklist[]) : [];
  return scope === BrowseScope.BOARDS ? all.filter((list) => isKanbanType(list.type)) : all;
};

const _kicker = (scope: BrowseScope, items: Item[], pinned: number): Record<string, number> => {
  if (scope === BrowseScope.NOTES) return { notes: items.length, pinned };
  const lists = items as Checklist[];
  if (scope === BrowseScope.BOARDS) {
    return lists.reduce(
      (sum, list) => {
        const summary = listSummaryOf(list);
        return { cards: sum.cards + summary.cards, inProgress: sum.inProgress + summary.inProgress };
      },
      { cards: 0, inProgress: 0 },
    );
  }
  return lists
    .filter((list) => list.type === "simple")
    .reduce(
      (sum, list) => {
        const summary = listSummaryOf(list);
        return { done: sum.done + summary.completed, total: sum.total + summary.total };
      },
      { done: 0, total: 0 },
    );
};

const _shown = async (page: ListedNote[], bodies: BodyCookie): Promise<Note[]> => {
  const wanted = new Set(
    page
      .slice(0, BODY_PAGE[bodies])
      .filter((note) => !isNoteEncrypted(note))
      .map((note) => note.uuid),
  );
  return mapPooled(page, BODY_READERS, async (note) => (wanted.has(note.uuid) ? bodiedNote(note) : unlistedNote(note)));
};

export const pageOfItems = <T extends Item>(
  scope: BrowseScope,
  items: T[],
  pinnedEntries: string[],
  query: BrowseQuery,
): BrowsePage<T> => {
  const keys = pinKeysOf(pinnedEntries);
  const isPinned = (item: Item) => Boolean(item.uuid) && keys.has(item.uuid);
  const matches = (item: Item, filter: string) =>
    scope === BrowseScope.NOTES
      ? matchesNoteFilter(filter as NoteFilter, isPinned(item))
      : matchesListFilter(item as Checklist, filter as ListFilter, isPinned(item));
  const limitFor = scope === BrowseScope.NOTES ? (filter: string) => noteLimitFor(filter as NoteFilter) : undefined;

  const scoped = inCategories(items, query.categories, query.recursive);
  const results = browseResults(scoped, query.filter, query.sort, matches, limitFor);
  const counts = Object.fromEntries(
    FILTERS[scope].map((filter) => {
      const found = scoped.filter((item) => matches(item, filter)).length;
      const limit = limitFor?.(filter);
      return [filter, limit ? Math.min(found, limit) : found];
    }),
  );

  const pages = Math.max(1, Math.ceil(results.length / query.perPage));
  const current = Math.min(query.page, pages);
  const start = (current - 1) * query.perPage;
  const pageItems = results.slice(start, start + query.perPage);
  const pinned = items.filter(isPinned).length;

  return {
    query: { ...query, page: current },
    pageItems,
    nextItems: results.slice(start + query.perPage, start + query.perPage * 2),
    total: results.length,
    counts,
    size: items.length,
    pinned,
    kicker: _kicker(scope, items, pinned),
  };
};

export const browsePage = async (
  scope: BrowseScope,
  user: SanitisedUser,
  query: BrowseQuery,
  bodies: BodyCookie = BodyCookie.OFF,
): Promise<BrowsePage<Item>> => {
  const items = await _listing(scope, user.username);
  const pinned = (scope === BrowseScope.NOTES ? user.pinnedNotes : user.pinnedLists) || [];
  const page = pageOfItems(scope, items, pinned, query);
  if (scope !== BrowseScope.NOTES) return page;
  return {
    ...page,
    pageItems: await _shown(page.pageItems as ListedNote[], bodies),
    nextItems: (page.nextItems as ListedNote[]).map(unlistedNote),
  };
};

export const browseFor = async (scope: unknown, raw: unknown): Promise<Result<BrowsePage<Item>>> => {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Not authenticated" };
  if (!isBrowseScope(scope)) return { success: false, error: "Invalid browse request" };
  return { success: true, data: await browsePage(scope, user, browseQueryOf(scope, raw, defaultFilterOf(scope, user))) };
};
