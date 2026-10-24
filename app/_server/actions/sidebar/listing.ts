import { createHash } from "crypto";
import type { Category, SidebarEntry, SidebarSnapshot } from "@/app/_types";
import { SIDEBAR_FIRST_SCREEN, SIDEBAR_INLINE_BUDGET, SIDEBAR_PAGE_SIZE } from "@/app/_consts/sidebar";
import { folderStats, groupByFolder, inlineRows } from "@/app/_utils/sidebar-tree-utils";

export const sidebarSnapshot = (
  items: SidebarEntry[],
  categories: Category[],
  stamp: string,
): SidebarSnapshot => {
  const groups = groupByFolder(items);
  return {
    stamp,
    folders: folderStats(categories, groups),
    rows: inlineRows(categories, groups, {
      whole: SIDEBAR_INLINE_BUDGET,
      firstScreen: SIDEBAR_FIRST_SCREEN,
      page: SIDEBAR_PAGE_SIZE,
    }),
  };
};

const UNSTAMPED_FIELDS = new Set(["updatedAt"]);

const _stampable = (key: string, value: unknown) => (UNSTAMPED_FIELDS.has(key) ? undefined : value);

export const sidebarStampOf = (items: SidebarEntry[], categories: Category[]): string => {
  const hash = createHash("sha1");
  hash.update(JSON.stringify(categories));
  items.forEach((item) => hash.update(JSON.stringify(item, _stampable)));
  return hash.digest("base64url").slice(0, 16);
};
