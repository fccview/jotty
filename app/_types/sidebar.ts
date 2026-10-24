import { SidebarRowKinds } from "@/app/_consts/sidebar";
import type { Category } from "./category";
import type { Checklist } from "./checklist";
import type { Note } from "./note";

export type SidebarEntry = Checklist | Note;

export interface FolderStats {
  direct: number;
  total: number;
}

export interface SidebarSnapshot {
  stamp: string;
  folders: Record<string, FolderStats>;
  rows: Record<string, SidebarEntry[]>;
}

export type SidebarSnapshots = Partial<Record<"notes" | "checklists", SidebarSnapshot>>;

export interface SidebarPage {
  stamp: string;
  total: number;
  rows: SidebarEntry[];
}

export interface SidebarSearch {
  snapshot: SidebarSnapshot;
  folders: string[];
  truncated: boolean;
}

export interface SidebarAnchor {
  key: string;
  offset: number;
  top: number;
}

export interface SidebarSpot {
  category: string;
  index: number;
}

interface RowBase {
  key: string;
  depth: number;
  gapDepth?: number;
}

export type SidebarRow =
  | (RowBase & { kind: SidebarRowKinds.ROOT_START; firstRoot?: string })
  | (RowBase & { kind: SidebarRowKinds.FOLDER; category: Category })
  | (RowBase & { kind: SidebarRowKinds.FOLDER_START; category: Category; firstChild?: string })
  | (RowBase & { kind: SidebarRowKinds.FOLDER_END; category: Category; isRoot: boolean })
  | (RowBase & { kind: SidebarRowKinds.ITEM; category: Category; index: number });
