import { DefaultChecklistFilter, DefaultNoteFilter } from "@/app/_types";

export enum BrowseSort {
  UPDATED = "updated",
  OLDEST = "oldest",
  AZ = "az",
}

export type BoardFilter =
  | "all"
  | "completed"
  | "incomplete"
  | "pinned"
  | "todo"
  | "in-progress";

export const NOTE_FILTERS: DefaultNoteFilter[] = ["all", "recent", "pinned"];

export const CHECKLIST_FILTERS: DefaultChecklistFilter[] = [
  "all",
  "completed",
  "incomplete",
  "pinned",
  "task",
  "simple",
];

export const BOARD_FILTERS: BoardFilter[] = [
  "all",
  "completed",
  "incomplete",
  "pinned",
  "todo",
  "in-progress",
];

export const BROWSE_SORTS = [BrowseSort.UPDATED, BrowseSort.OLDEST, BrowseSort.AZ];

export const RECENT_NOTES_LIMIT = 50;

export const DEFAULT_ITEMS_PER_PAGE = 12;
