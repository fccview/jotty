import { describe, it, expect, vi } from "vitest";
import type { Category, SidebarEntry, SidebarPage } from "@/app/_types";
import { SIDEBAR_PAGE_SIZE } from "@/app/_consts/sidebar";
import { folderStampOf, searchSnapshot, sidebarSnapshot } from "@/app/_server/actions/sidebar/listing";
import { offlineKey, type OfflineFolder } from "@/app/_utils/offline/sidebar-cache";
import {
  syncOfflineSidebar,
  type OfflineJob,
  type OfflineShelf,
} from "@/app/_utils/offline/sidebar-sync";

const USER = "fccview";
const MODE = "notes";

const folder = (path: string, parent?: string): Category => ({
  name: path.split("/").pop() as string,
  path,
  parent,
  level: path.split("/").length - 1,
  count: 0,
});

const entry = (uuid: string, category: string, extra: Record<string, unknown> = {}) =>
  ({ uuid, id: uuid, title: uuid, category, ...extra }) as unknown as SidebarEntry;

const CATEGORIES = [folder("Work"), folder("Work/Projects", "Work"), folder("Home")];

const library = (items: SidebarEntry[], categories = CATEGORIES) => sidebarSnapshot(items, categories);

const jobOf = (items: SidebarEntry[], categories = CATEGORIES, username = USER): OfflineJob => {
  const snapshot = library(items, categories);
  return {
    username,
    stamp: snapshot.stamp,
    modes: [
      {
        mode: MODE,
        folders: Object.entries(snapshot.folders).map(([path, stats]) => ({
          path,
          direct: stats.direct,
          stamp: stats.stamp,
        })),
      },
    ],
  };
};

const shelfOver = (items: () => SidebarEntry[], stored = new Map<string, OfflineFolder>()) => {
  const page = vi.fn(async (_mode: string, category: string, offset: number, stamp: string): Promise<SidebarPage> => {
    const inFolder = items().filter((item) => item.category === category);
    return {
      stamp,
      folderStamp: folderStampOf(inFolder),
      total: inFolder.length,
      rows: inFolder.slice(offset, offset + SIDEBAR_PAGE_SIZE),
    };
  });
  const forget = vi.fn(async (keys: string[]) => keys.forEach((key) => stored.delete(key)));
  const shelf: OfflineShelf = {
    page,
    stamps: async (username, mode) =>
      new Map(
        Array.from(stored.values())
          .filter((record) => record.username === username && record.mode === mode)
          .map((record) => [record.key, record.stamp]),
      ),
    keep: async (record) => stored.set(record.key, record),
    forget,
  };
  return { shelf, page, forget, stored };
};

const rowsAt = (stored: Map<string, OfflineFolder>, category: string) =>
  stored.get(offlineKey(USER, MODE, category))?.rows.map((row) => row.uuid);

const fetchedFolders = (page: ReturnType<typeof shelfOver>["page"]) =>
  Array.from(new Set(page.mock.calls.map(([, category]) => category))).sort();

const always = () => true;

describe("sidebar snapshot folder stamps", () => {
  const items = [entry("a", "Work"), entry("b", "Work/Projects"), entry("c", "Home")];

  it("gives every folder a stamp, empty folders included", () => {
    const snapshot = library([entry("a", "Work")]);
    expect(Object.values(snapshot.folders).every((stats) => typeof stats.stamp === "string")).toBe(true);
    expect(snapshot.folders.Home.stamp).toBe(folderStampOf([]));
  });

  it("matches the stamp the rows endpoint computes for the same folder", () => {
    expect(library(items).folders.Work.stamp).toBe(folderStampOf([entry("a", "Work")]));
  });

  it("moves only the stamps of the folders an item left and landed in", () => {
    const before = library(items).folders;
    const after = library([entry("a", "Home"), entry("b", "Work/Projects"), entry("c", "Home")]).folders;

    expect(after.Work.stamp).not.toBe(before.Work.stamp);
    expect(after.Home.stamp).not.toBe(before.Home.stamp);
    expect(after["Work/Projects"].stamp).toBe(before["Work/Projects"].stamp);
  });

  it("ignores a bare updatedAt bump, like the library stamp does", () => {
    const before = library([entry("a", "Work", { updatedAt: "2026-01-01" })]);
    const after = library([entry("a", "Work", { updatedAt: "2026-02-02" })]);

    expect(after.folders.Work.stamp).toBe(before.folders.Work.stamp);
    expect(after.stamp).toBe(before.stamp);
  });

  it("moves the library stamp but no folder stamp when a folder is added", () => {
    const before = library(items);
    const after = library(items, [...CATEGORIES, folder("Brand new")]);

    expect(after.stamp).not.toBe(before.stamp);
    expect(after.folders.Work.stamp).toBe(before.folders.Work.stamp);
    expect(after.folders.Home.stamp).toBe(before.folders.Home.stamp);
  });

  it("moves the library stamp when items swap places across folders", () => {
    const before = library([entry("a", "Work"), entry("c", "Home"), entry("b", "Work")]);
    const after = library([entry("a", "Work"), entry("b", "Work"), entry("c", "Home")]);

    expect(after.folders.Work.stamp).toBe(before.folders.Work.stamp);
    expect(after.stamp).not.toBe(before.stamp);
  });

  it("keeps the search stamp for search snapshots without stamping their folders", () => {
    const snapshot = searchSnapshot(items, CATEGORIES, "search:abc");
    expect(snapshot.stamp).toBe("search:abc");
    expect(snapshot.folders.Work).toEqual({ direct: 1, total: 2 });
  });
});

describe("offline sidebar sync", () => {
  it("caches every folder on a fresh install", async () => {
    const items = [entry("a", "Work"), entry("b", "Work/Projects"), entry("c", "Home")];
    const { shelf, page, stored } = shelfOver(() => items);

    await syncOfflineSidebar(jobOf(items), shelf, always);

    expect(fetchedFolders(page)).toEqual(["Home", "Work", "Work/Projects"]);
    expect(rowsAt(stored, "Work")).toEqual(["a"]);
    expect(rowsAt(stored, "Home")).toEqual(["c"]);
  });

  it("pages through a folder bigger than one page", async () => {
    const items = Array.from({ length: SIDEBAR_PAGE_SIZE + 3 }, (_, at) => entry(`n${at}`, "Work"));
    const { shelf, page, stored } = shelfOver(() => items);

    await syncOfflineSidebar(jobOf(items), shelf, always);

    expect(page.mock.calls.filter(([, category]) => category === "Work")).toHaveLength(2);
    expect(rowsAt(stored, "Work")).toHaveLength(SIDEBAR_PAGE_SIZE + 3);
  });

  it("fetches nothing again when no folder changed", async () => {
    const items = [entry("a", "Work"), entry("c", "Home")];
    const { shelf, page } = shelfOver(() => items);

    await syncOfflineSidebar(jobOf(items), shelf, always);
    page.mockClear();
    await syncOfflineSidebar(jobOf(items, [...CATEGORIES, folder("Brand new")]), shelf, always);

    expect(page).not.toHaveBeenCalled();
  });

  it("refetches both ends of a move and nothing else", async () => {
    let items = [entry("a", "Work"), entry("b", "Work/Projects"), entry("c", "Home")];
    const { shelf, page, stored } = shelfOver(() => items);

    await syncOfflineSidebar(jobOf(items), shelf, always);
    page.mockClear();

    items = [entry("b", "Work/Projects"), entry("c", "Home"), entry("a", "Home")];
    await syncOfflineSidebar(jobOf(items), shelf, always);

    expect(fetchedFolders(page)).toEqual(["Home"]);
    expect(rowsAt(stored, "Work")).toEqual([]);
    expect(rowsAt(stored, "Home")).toEqual(["c", "a"]);
  });

  it("drops a deleted folder and fetches a renamed one under its new name", async () => {
    let items = [entry("a", "Work"), entry("c", "Home")];
    const { shelf, page, stored } = shelfOver(() => items);

    await syncOfflineSidebar(jobOf(items), shelf, always);
    page.mockClear();

    items = [entry("a", "Office"), entry("c", "Home")];
    await syncOfflineSidebar(jobOf(items, [folder("Office"), folder("Home")]), shelf, always);

    expect(fetchedFolders(page)).toEqual(["Office"]);
    expect(stored.has(offlineKey(USER, MODE, "Work"))).toBe(false);
    expect(stored.has(offlineKey(USER, MODE, "Work/Projects"))).toBe(false);
    expect(rowsAt(stored, "Office")).toEqual(["a"]);
  });

  it("refetches a mounted folder once the owner changes what is in it", async () => {
    const shared = folder("alice");
    let items = [entry("s1", "alice", { sharedFrom: "alice" })];
    const { shelf, page, stored } = shelfOver(() => items);

    await syncOfflineSidebar(jobOf(items, [shared]), shelf, always);
    page.mockClear();

    items = [entry("s1", "alice", { sharedFrom: "alice", title: "renamed by alice" })];
    await syncOfflineSidebar(jobOf(items, [shared]), shelf, always);

    expect(fetchedFolders(page)).toEqual(["alice"]);
    expect(stored.get(offlineKey(USER, MODE, "alice"))?.rows[0].title).toBe("renamed by alice");
  });

  it("stores what the server served, not what the snapshot expected", async () => {
    let served = [entry("a", "Work", { title: "renamed elsewhere" })];
    const original = [entry("a", "Work")];
    const { shelf, page, stored } = shelfOver(() => served);

    await syncOfflineSidebar(jobOf(original), shelf, always);
    expect(stored.get(offlineKey(USER, MODE, "Work"))?.stamp).toBe(folderStampOf(served));

    served = original;
    page.mockClear();
    await syncOfflineSidebar(jobOf(original), shelf, always);

    expect(fetchedFolders(page)).toEqual(["Work"]);
    expect(stored.get(offlineKey(USER, MODE, "Work"))?.rows[0].title).toBe("a");
  });

  it("keeps the offline copy when a snapshot arrives without any folders", async () => {
    const items = [entry("a", "Work")];
    const { shelf, forget, stored } = shelfOver(() => items);

    await syncOfflineSidebar(jobOf(items), shelf, always);
    await syncOfflineSidebar({ username: USER, stamp: "x", modes: [{ mode: MODE, folders: [] }] }, shelf, always);

    expect(forget).not.toHaveBeenCalled();
    expect(rowsAt(stored, "Work")).toEqual(["a"]);
  });

  it("leaves other users' offline copies alone, even when their name looks like a key prefix", async () => {
    const items = [entry("a", "Work")];
    const { shelf, stored } = shelfOver(() => items);
    const lookalike = `${USER}::${MODE}`;
    const theirs = offlineKey(lookalike, MODE, "Work");
    stored.set(theirs, { key: theirs, stamp: "x", rows: [], username: lookalike, mode: MODE });

    await syncOfflineSidebar(jobOf(items), shelf, always);

    expect(stored.has(theirs)).toBe(true);
  });

  it("keeps the folders it finished when a page fails halfway", async () => {
    const items = [entry("a", "Work"), entry("c", "Home")];
    const { shelf, page, stored } = shelfOver(() => items);
    const fetches = page.getMockImplementation()!;
    page.mockImplementation(async (mode, category, offset, stamp) => {
      if (category === "Home") throw new Error("offline");
      return fetches(mode, category, offset, stamp);
    });

    await expect(syncOfflineSidebar(jobOf(items), shelf, always)).rejects.toThrow("offline");

    expect(rowsAt(stored, "Work")).toEqual(["a"]);
    expect(stored.has(offlineKey(USER, MODE, "Home"))).toBe(false);
  });

  it("pages on to what the server holds when a folder grew past the snapshot", async () => {
    const before = Array.from({ length: SIDEBAR_PAGE_SIZE }, (_, at) => entry(`n${at}`, "Work"));
    const grown = [...before, entry("late", "Work")];
    const { shelf, stored } = shelfOver(() => grown);

    await syncOfflineSidebar(jobOf(before), shelf, always);

    expect(rowsAt(stored, "Work")).toHaveLength(SIDEBAR_PAGE_SIZE + 1);
    expect(stored.get(offlineKey(USER, MODE, "Work"))?.stamp).toBe(folderStampOf(grown));
  });

  it("refetches a folder whose pages came back without a stamp", async () => {
    const items = [entry("a", "Work")];
    const { shelf, page, stored } = shelfOver(() => items);
    const fetches = page.getMockImplementation()!;
    page.mockImplementationOnce(async (...args) => ({ ...(await fetches(...args)), folderStamp: undefined }));

    await syncOfflineSidebar(jobOf(items, [folder("Work")]), shelf, always);
    page.mockClear();
    await syncOfflineSidebar(jobOf(items, [folder("Work")]), shelf, always);

    expect(fetchedFolders(page)).toEqual(["Work"]);
    expect(stored.get(offlineKey(USER, MODE, "Work"))?.stamp).toBe(folderStampOf(items));
  });

  it("stops as soon as a newer job takes over", async () => {
    const items = [entry("a", "Work"), entry("c", "Home")];
    const { shelf, page, forget, stored } = shelfOver(() => items);

    await syncOfflineSidebar(jobOf(items), shelf, () => false);

    expect(page).not.toHaveBeenCalled();
    expect(forget).not.toHaveBeenCalled();
    expect(stored.size).toBe(0);
  });
});
