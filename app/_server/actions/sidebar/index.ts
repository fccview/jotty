import type { Result, SidebarEntry, SidebarPage, SidebarSearch, SidebarSpot } from "@/app/_types";
import { SIDEBAR_PAGE_SIZE, SIDEBAR_SEARCH_LIMIT } from "@/app/_consts/sidebar";
import { categoriesFor } from "@/app/_server/actions/category/tree";
import { getUsername } from "@/app/_server/actions/users";
import { folderOf } from "@/app/_utils/sidebar-tree-utils";
import { isItemMode, itemListing } from "@/app/_server/actions/catalog/listing";
import { folderStampOf, searchSnapshot } from "./listing";

const STAMP_MEMO_SIZE = 64;
const stampMemo = new Map<string, { items: SidebarEntry[]; stamp: string }>();

const _sameItems = (left: SidebarEntry[], right: SidebarEntry[]): boolean =>
  left.length === right.length && left.every((item, index) => item === right[index]);

const _folderStamp = (key: string, items: SidebarEntry[]): string => {
  const known = stampMemo.get(key);
  if (known && _sameItems(known.items, items)) return known.stamp;
  const stamp = folderStampOf(items);
  stampMemo.delete(key);
  stampMemo.set(key, { items, stamp });
  if (stampMemo.size > STAMP_MEMO_SIZE) stampMemo.delete(stampMemo.keys().next().value as string);
  return stamp;
};

const _whole = (value: unknown): number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;

export const getSidebarRows = async (
  mode: unknown,
  category: unknown,
  offset: unknown,
  stamp: string,
  stamped = false,
): Promise<Result<SidebarPage>> => {
  const username = await getUsername();
  if (!username) return { success: false, error: "Not authenticated" };
  if (!isItemMode(mode) || typeof category !== "string") {
    return { success: false, error: "Invalid sidebar request" };
  }

  const start = _whole(offset);
  const inFolder = (await itemListing(mode, username)).filter((item) => folderOf(item) === category);
  return {
    success: true,
    data: {
      stamp,
      ...(stamped && { folderStamp: _folderStamp(`${username}:${mode}:${category}`, inFolder) }),
      total: inFolder.length,
      rows: inFolder.slice(start, start + SIDEBAR_PAGE_SIZE),
    },
  };
};

export const locateSidebarItem = async (
  mode: unknown,
  uuid: unknown,
): Promise<Result<SidebarSpot | null>> => {
  const username = await getUsername();
  if (!username) return { success: false, error: "Not authenticated" };
  if (!isItemMode(mode) || typeof uuid !== "string") {
    return { success: false, error: "Invalid sidebar request" };
  }

  const items = await itemListing(mode, username);
  const found = items.find((item) => item.uuid === uuid);
  if (!found) return { success: true, data: null };

  const category = folderOf(found);
  const index = items.filter((item) => folderOf(item) === category).indexOf(found);
  return { success: true, data: { category, index } };
};

export const searchSidebar = async (
  mode: unknown,
  query: unknown,
  stamp: string,
): Promise<Result<SidebarSearch>> => {
  const username = await getUsername();
  if (!username) return { success: false, error: "Not authenticated" };
  if (!isItemMode(mode) || typeof query !== "string") {
    return { success: false, error: "Invalid sidebar request" };
  }

  const needle = query.trim().toLowerCase();
  const [items, tree] = await Promise.all([itemListing(mode, username), categoriesFor(mode, username)]);
  const categories = "data" in tree ? tree.data || [] : [];
  const found = items.filter((item) => (item.title || "").toLowerCase().includes(needle));

  return {
    success: true,
    data: {
      snapshot: searchSnapshot(found.slice(0, SIDEBAR_SEARCH_LIMIT), categories, `search:${stamp}:${needle}`),
      folders: categories
        .filter((category) => category.name.toLowerCase().includes(needle))
        .map((category) => category.path),
      truncated: found.length > SIDEBAR_SEARCH_LIMIT,
    },
  };
};
