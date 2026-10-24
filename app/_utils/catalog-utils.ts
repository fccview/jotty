import type { AdjacentNotes, Checklist, ContentFilter, ItemShelf, LibraryStats, Note } from "@/app/_types";
import { isKanbanType } from "@/app/_types/enums";
import { normalizeTag, tagMatchesFilter } from "@/app/_utils/tag-utils";

interface Shelved {
  uuid?: string;
  title?: string;
  category?: string;
  lockReason?: unknown;
  tags?: string[];
}

export interface FindOptions {
  limit: number;
  byCategory?: boolean;
}

const _matches = (item: Shelved, needle: string, byCategory: boolean): boolean =>
  !needle ||
  (item.title || "").toLowerCase().includes(needle) ||
  (byCategory && (item.category || "").toLowerCase().includes(needle));

export const findOnShelf = (
  notes: Partial<Note>[],
  checklists: Partial<Checklist>[],
  query: string,
  { limit, byCategory = false }: FindOptions,
): ItemShelf => {
  const needle = query.trim().toLowerCase();
  const pick = <T extends Shelved>(items: T[], room: number): T[] => {
    const picked: T[] = [];
    for (const item of items) {
      if (picked.length >= room) break;
      if (item.uuid && !item.lockReason && _matches(item, needle, byCategory)) picked.push(item);
    }
    return picked;
  };
  const foundNotes = pick(notes, limit);
  const foundLists = pick(checklists, limit);
  const listRoom = Math.max(limit - foundNotes.length, Math.min(foundLists.length, Math.floor(limit / 2)));
  return {
    notes: foundNotes.slice(0, limit - Math.min(listRoom, foundLists.length)),
    checklists: foundLists.slice(0, listRoom),
  };
};

export const shelfByUuid = (
  notes: Partial<Note>[],
  checklists: Partial<Checklist>[],
  uuids: string[],
): ItemShelf => {
  const wanted = new Set(uuids.map((uuid) => uuid.toLowerCase()));
  const has = (item: Shelved) => Boolean(item.uuid && wanted.has(item.uuid.toLowerCase()));
  return { notes: notes.filter(has), checklists: checklists.filter(has) };
};

export const shelfTagged = (
  notes: Partial<Note>[],
  checklists: Partial<Checklist>[],
  tag: string,
): ItemShelf => {
  const wanted = normalizeTag(tag);
  const has = (item: Shelved) => Boolean(item.tags?.some((each) => tagMatchesFilter(each, wanted)));
  return { notes: notes.filter(has), checklists: checklists.filter(has) };
};

export const adjacentOf = (
  notes: Partial<Note>[],
  uuid: string,
  filter: ContentFilter | null,
): AdjacentNotes => {
  const scoped =
    filter?.type === "category" && filter.value
      ? notes.filter((note) => note.category === filter.value)
      : filter?.type === "tag" && filter.value
        ? notes.filter((note) => note.tags?.includes(filter.value))
        : notes;

  const currentIndex = scoped.findIndex((note) => note.uuid === uuid);
  if (currentIndex === -1) return { prev: null, next: null, currentIndex: -1, total: scoped.length };

  return {
    prev: currentIndex > 0 ? scoped[currentIndex - 1] : null,
    next: currentIndex < scoped.length - 1 ? scoped[currentIndex + 1] : null,
    currentIndex,
    total: scoped.length,
  };
};

export const libraryStatsOf = (
  notes: Partial<Note>[],
  checklists: Partial<Checklist>[],
): LibraryStats => {
  const boards = checklists.filter((list) => isKanbanType(list.type)).length;
  return {
    notes: notes.length,
    encryptedNotes: notes.filter((note) => note.encrypted).length,
    checklists: checklists.length,
    boards,
  };
};
