import { describe, it, expect } from "vitest";
import { SidebarRowKinds } from "@/app/_consts/sidebar";
import type { Category } from "@/app/_types";
import {
  collapsiblePaths,
  flattenSidebar,
  folderStats,
  groupByFolder,
  inlineRows,
  searchedCategories,
} from "@/app/_utils/sidebar-tree-utils";

const folder = (path: string, parent?: string): Category => ({
  name: path.split("/").pop() as string,
  path,
  parent,
  level: path.split("/").length - 1,
  count: 0,
});

const CATEGORIES: Category[] = [
  folder("Work"),
  folder("Work/Projects", "Work"),
  folder("Work/Projects/Old", "Work/Projects"),
  folder("Home"),
  folder("Uncategorized"),
];

const item = (uuid: string, category?: string) => ({ uuid, category });

const ITEMS = [
  item("a", "Work"),
  item("b", "Work/Projects"),
  item("c", "Work"),
  item("d", "Work/Projects/Old"),
  item("e", ""),
  item("f", "Home"),
];

describe("groupByFolder", () => {
  it("keeps the listing order inside each folder and files root items under Uncategorized", () => {
    const groups = groupByFolder(ITEMS);
    expect(groups.get("Work")?.map((entry) => entry.uuid)).toEqual(["a", "c"]);
    expect(groups.get("Uncategorized")?.map((entry) => entry.uuid)).toEqual(["e"]);
  });
});

describe("folderStats", () => {
  it("counts direct items and everything nested below", () => {
    const stats = folderStats(CATEGORIES, groupByFolder(ITEMS));
    expect(stats.Work).toEqual({ direct: 2, total: 4 });
    expect(stats["Work/Projects"]).toEqual({ direct: 1, total: 2 });
    expect(stats["Work/Projects/Old"]).toEqual({ direct: 1, total: 1 });
    expect(stats.Home).toEqual({ direct: 1, total: 1 });
  });
});

describe("inlineRows", () => {
  it("sends every row when the library fits in the budget", () => {
    const rows = inlineRows(CATEGORIES, groupByFolder(ITEMS), { whole: 10, firstScreen: 3, page: 1 });
    expect(Object.values(rows).flat()).toHaveLength(ITEMS.length);
  });

  it("spends the budget top down, subfolders before their parent's items", () => {
    const rows = inlineRows(CATEGORIES, groupByFolder(ITEMS), { whole: 5, firstScreen: 3, page: 1 });
    expect(Object.keys(rows)).toEqual(["Work/Projects/Old", "Work/Projects", "Work"]);
    expect(rows.Work.map((entry) => entry.uuid)).toEqual(["a"]);
  });
});

describe("flattenSidebar", () => {
  const stats = folderStats(CATEGORIES, groupByFolder(ITEMS));

  it("lays rows out like the nested tree, with the same drop targets", () => {
    const keys = flattenSidebar(CATEGORIES, new Set(), stats).map((row) => row.key);
    expect(keys.slice(0, 12)).toEqual([
      "drop-root-start",
      "folder::Work",
      "drop-start::Work",
      "folder::Work/Projects",
      "drop-start::Work/Projects",
      "folder::Work/Projects/Old",
      "drop-start::Work/Projects/Old",
      "item::Work/Projects/Old::0",
      "drop-after-category::Work/Projects/Old",
      "item::Work/Projects::0",
      "drop-after-category::Work/Projects",
      "item::Work::0",
    ]);
    expect(keys).toContain("drop-after-root::Work");
  });

  it("hides everything inside a collapsed folder but keeps its header", () => {
    const rows = flattenSidebar(CATEGORIES, new Set(["Work"]), stats);
    const keys = rows.map((row) => row.key);
    expect(keys).toContain("folder::Work");
    expect(keys).not.toContain("drop-start::Work");
    expect(keys.some((key) => key.startsWith("item::Work"))).toBe(false);
    expect(keys[keys.indexOf("folder::Work") + 1]).toBe("drop-after-root::Work");
  });

  it("puts the gaps where the nested containers had them", () => {
    const rows = flattenSidebar(CATEGORIES, new Set(), stats);
    const byKey = new Map(rows.map((row) => [row.key, row]));
    expect(byKey.get("folder::Work")?.gapDepth).toBe(0);
    expect(byKey.get("drop-start::Work")).toMatchObject({ depth: 1, gapDepth: 0 });
    expect(byKey.get("folder::Work/Projects")?.gapDepth).toBeUndefined();
    expect(byKey.get("drop-start::Work/Projects")).toMatchObject({ depth: 2, gapDepth: 1 });
    expect(byKey.get("drop-after-root::Work")?.gapDepth).toBeUndefined();
  });

  it("names the first subfolder as the drop-start target", () => {
    const start = flattenSidebar(CATEGORIES, new Set(), stats).find(
      (row) => row.key === "drop-start::Work",
    );
    expect(start?.kind === SidebarRowKinds.FOLDER_START && start.firstChild).toBe("category::Work/Projects");
  });
});

describe("collapsiblePaths", () => {
  it("lists folders that have subfolders or items of their own", () => {
    const stats = folderStats([...CATEGORIES, folder("Empty")], groupByFolder(ITEMS));
    expect(collapsiblePaths([...CATEGORIES, folder("Empty")], stats)).toEqual([
      "Work",
      "Work/Projects",
      "Work/Projects/Old",
      "Home",
      "Uncategorized",
    ]);
  });
});

describe("searchedCategories", () => {
  it("keeps folders with matches and every folder above them", () => {
    const hits = folderStats(CATEGORIES, groupByFolder([item("d", "Work/Projects/Old")]));
    expect(searchedCategories(CATEGORIES, hits, []).map((category) => category.path)).toEqual([
      "Work",
      "Work/Projects",
      "Work/Projects/Old",
    ]);
  });

  it("keeps a folder whose name matched even when none of its items did", () => {
    const hits = folderStats(CATEGORIES, groupByFolder([]));
    expect(searchedCategories(CATEGORIES, hits, ["Home"]).map((category) => category.path)).toEqual(["Home"]);
  });
});
