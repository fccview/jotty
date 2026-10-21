import { Checklist, DefaultChecklistFilter, Note } from "@/app/_types";
import { BoardFilter, BrowseSort, NoteFilter, RECENT_NOTES_LIMIT } from "@/app/_consts/browse";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { isKanbanType } from "@/app/_types/enums";
import { isInCategory } from "@/app/_utils/category-path-utils";
import { newestFirst, oldestFirst } from "@/app/_utils/order-utils";
import { listSummaryOf } from "@/app/_utils/browse/list-summary-utils";

export interface Browsable {
  title: string;
  category?: string;
  updatedAt: string;
}

export const SORTERS: Record<BrowseSort, (a: Browsable, b: Browsable) => number> = {
  [BrowseSort.UPDATED]: newestFirst,
  [BrowseSort.OLDEST]: oldestFirst,
  [BrowseSort.AZ]: (a, b) => a.title.localeCompare(b.title),
};

export const inCategories = <T extends Browsable>(
  items: T[],
  categories: string[],
  recursive: boolean,
): T[] =>
  categories.length
    ? items.filter((item) =>
        categories.some((path) => isInCategory(item.category || UNCATEGORIZED, path, recursive)),
      )
    : items;

export const browseResults = <T extends Browsable, F extends string>(
  items: T[],
  filter: F,
  sort: BrowseSort,
  matches: (item: T, filter: F) => boolean,
  limitFor?: (filter: F) => number | undefined,
): T[] => {
  const found = items.filter((item) => matches(item, filter));
  const limit = limitFor?.(filter);
  const kept = limit && limit < found.length ? found.sort(newestFirst).slice(0, limit) : found;
  return kept.sort(SORTERS[sort]);
};

export const pinKeysOf = (entries: string[]): Set<string> =>
  new Set(entries.flatMap((entry) => [entry, entry.split("/").pop() || entry]));

export const matchesNoteFilter = (filter: NoteFilter, isPinned: boolean): boolean =>
  filter !== "pinned" || isPinned;

export const noteLimitFor = (filter: NoteFilter): number | undefined =>
  filter === "recent" ? RECENT_NOTES_LIMIT : undefined;

export const firstNotesPage = (
  notes: Note[],
  filter: NoteFilter,
  pinnedEntries: string[],
  perPage: number,
): Note[] => {
  const keys = pinKeysOf(pinnedEntries);
  return browseResults(
    notes,
    filter,
    BrowseSort.UPDATED,
    (note, candidate) => matchesNoteFilter(candidate, Boolean(note.uuid) && keys.has(note.uuid)),
    noteLimitFor,
  ).slice(0, perPage);
};

export const matchesListFilter = (
  list: Checklist,
  filter: DefaultChecklistFilter | BoardFilter,
  isPinned: boolean,
): boolean => {
  switch (filter) {
    case "pinned":
      return isPinned;
    case "completed":
      return listSummaryOf(list).isFinished;
    case "incomplete":
      return !listSummaryOf(list).isFinished;
    case "task":
      return isKanbanType(list.type);
    case "simple":
      return list.type === "simple";
    case "todo":
      return listSummaryOf(list).hasTodo;
    case "in-progress":
      return listSummaryOf(list).hasInProgress;
    default:
      return true;
  }
};
