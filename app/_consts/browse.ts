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
