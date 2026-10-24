import { ContentFilter } from "./context";
import type { Note } from "./note";

export interface GetNotesOptions {
  username?: string;
  allowArchived?: boolean;
  isRaw?: boolean;
  projection?: string[];
  metadataOnly?: boolean;
  excerptLength?: number;
  filter?: ContentFilter;
  limit?: number;
  offset?: number;
  pinnedPaths?: string[];
  preserveOrder?: boolean;
  summarize?: boolean;
  bodiesFor?: (notes: Note[]) => string[];
  keepSources?: boolean;
  verify?: boolean;
}

export interface GetChecklistsOptions {
  username?: string;
  allowArchived?: boolean;
  isRaw?: boolean;
  projection?: string[];
  metadataOnly?: boolean;
  filter?: ContentFilter;
  limit?: number;
  offset?: number;
  pinnedPaths?: string[];
  preserveOrder?: boolean;
  countOpenItems?: boolean;
  summarize?: boolean;
}
