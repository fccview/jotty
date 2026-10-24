import type { Result, SidebarPage, SidebarSearch, SidebarSpot } from "@/app/_types";
import { SIDEBAR_PAGE_SIZE, SIDEBAR_SEARCH_LIMIT } from "@/app/_consts/sidebar";
import { categoriesFor } from "@/app/_server/actions/category/tree";
import { getUsername } from "@/app/_server/actions/users";
import { folderOf } from "@/app/_utils/sidebar-tree-utils";
import { isItemMode, itemListing } from "@/app/_server/actions/catalog/listing";
import { sidebarSnapshot } from "./listing";

const _whole = (value: unknown): number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;

export const getSidebarRows = async (
  mode: unknown,
  category: unknown,
  offset: unknown,
  stamp: string,
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
      snapshot: sidebarSnapshot(found.slice(0, SIDEBAR_SEARCH_LIMIT), categories, `search:${stamp}:${needle}`),
      folders: categories
        .filter((category) => category.name.toLowerCase().includes(needle))
        .map((category) => category.path),
      truncated: found.length > SIDEBAR_SEARCH_LIMIT,
    },
  };
};
