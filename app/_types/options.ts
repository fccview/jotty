import { ContentFilter } from "./context";

export interface GetNotesOptions {
  username?: string;
  allowArchived?: boolean;
  isRaw?: boolean;
  projection?: string[];
  metadataOnly?: boolean;
  excerptLength?: number;
  filter?: ContentFilter;
  limit?: number;
  preserveOrder?: boolean;
}

export interface GetChecklistsOptions {
  username?: string;
  allowArchived?: boolean;
  isRaw?: boolean;
  projection?: string[];
  metadataOnly?: boolean;
  filter?: ContentFilter;
  limit?: number;
  preserveOrder?: boolean;
}
