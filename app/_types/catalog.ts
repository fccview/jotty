import type { Checklist } from "./checklist";
import type { Note } from "./note";
import type { ItemTypes } from "./enums";

export interface ItemShelf {
  notes: Partial<Note>[];
  checklists: Partial<Checklist>[];
}

export interface LibraryStats {
  notes: number;
  encryptedNotes: number;
  checklists: number;
  boards: number;
}

export interface WikiAsk {
  target: string;
  bound?: string;
}

export interface WikiHit {
  uuid: string;
  type: ItemTypes;
  title?: string;
  category?: string;
}

export interface AdjacentNotes {
  prev: Partial<Note> | null;
  next: Partial<Note> | null;
  currentIndex: number;
  total: number;
}
