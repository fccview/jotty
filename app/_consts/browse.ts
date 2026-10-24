export enum BrowseSort {
  UPDATED = "updated",
  OLDEST = "oldest",
  AZ = "az",
}

export enum BrowseScope {
  NOTES = "notes",
  CHECKLISTS = "checklists",
  BOARDS = "boards",
}

export const NOTE_FILTERS = ["all", "recent", "pinned"] as const;

export const CHECKLIST_FILTERS = [
  "all",
  "completed",
  "incomplete",
  "pinned",
  "task",
  "simple",
] as const;

export const BOARD_FILTERS = [
  "all",
  "completed",
  "incomplete",
  "pinned",
  "todo",
  "in-progress",
] as const;

export type NoteFilter = (typeof NOTE_FILTERS)[number];
export type ChecklistFilter = (typeof CHECKLIST_FILTERS)[number];
export type BoardFilter = (typeof BOARD_FILTERS)[number];
export type ListFilter = ChecklistFilter | BoardFilter;

export const BROWSE_SORTS = [BrowseSort.UPDATED, BrowseSort.OLDEST, BrowseSort.AZ];

export const RECENT_NOTES_LIMIT = 50;

export const DEFAULT_ITEMS_PER_PAGE = 12;

export const PER_PAGE_OPTIONS = [12, 24, 36, 72, 84, 120];

export const MAX_BODY_BATCH = Math.max(...PER_PAGE_OPTIONS);

export const NOTE_BODIES_COOKIE = "jotty-note-bodies";

export enum BodyCookie {
  ON = "1",
  OFF = "0",
  SELECTED = "2",
}

export const DESKTOP_QUERY = "(min-width: 1024px)";
