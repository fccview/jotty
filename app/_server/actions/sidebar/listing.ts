import { createHash } from "crypto";
import type {
  Category,
  FolderStats,
  LibrarySnapshot,
  SidebarEntry,
  SidebarSnapshot,
  StampedFolderStats,
} from "@/app/_types";
import { SIDEBAR_FIRST_SCREEN, SIDEBAR_INLINE_BUDGET, SIDEBAR_PAGE_SIZE } from "@/app/_consts/sidebar";
import { folderOf, folderStats, groupByFolder, inlineRows } from "@/app/_utils/sidebar-tree-utils";

const STAMP_LENGTH = 16;
const UNSTAMPED_FIELDS = new Set(["updatedAt"]);

const _stampable = (key: string, value: unknown) => (UNSTAMPED_FIELDS.has(key) ? undefined : value);

const _digest = (parts: string[]): string => {
  const hash = createHash("sha1");
  parts.forEach((part) => hash.update(part));
  return hash.digest("base64url").slice(0, STAMP_LENGTH);
};

export const folderStampOf = (items: SidebarEntry[] = []): string =>
  _digest(items.map((item) => JSON.stringify(item, _stampable)));

const _folderStamps = (groups: Map<string, SidebarEntry[]>): Map<string, string> =>
  new Map(Array.from(groups, ([folder, items]) => [folder, folderStampOf(items)]));

const _libraryStamp = (
  items: SidebarEntry[],
  categories: Category[],
  stamps: Map<string, string>,
): string =>
  _digest([
    JSON.stringify(categories),
    JSON.stringify(Array.from(stamps)),
    items.map((item) => folderOf(item)).join("\n"),
  ]);

const _rowsOf = (groups: Map<string, SidebarEntry[]>, categories: Category[]) =>
  inlineRows(categories, groups, {
    whole: SIDEBAR_INLINE_BUDGET,
    firstScreen: SIDEBAR_FIRST_SCREEN,
    page: SIDEBAR_PAGE_SIZE,
  });

const _stampedFolders = (
  folders: Record<string, FolderStats>,
  stamps: Map<string, string>,
): Record<string, StampedFolderStats> => {
  const empty = folderStampOf();
  return Object.fromEntries(
    Object.entries(folders).map(([folder, stats]) => [folder, { ...stats, stamp: stamps.get(folder) ?? empty }]),
  );
};

export const sidebarSnapshot = (items: SidebarEntry[], categories: Category[]): LibrarySnapshot => {
  const groups = groupByFolder(items);
  const stamps = _folderStamps(groups);
  return {
    stamp: _libraryStamp(items, categories, stamps),
    folders: _stampedFolders(folderStats(categories, groups), stamps),
    rows: _rowsOf(groups, categories),
  };
};

export const searchSnapshot = (items: SidebarEntry[], categories: Category[], stamp: string): SidebarSnapshot => {
  const groups = groupByFolder(items);
  return { stamp, folders: folderStats(categories, groups), rows: _rowsOf(groups, categories) };
};
