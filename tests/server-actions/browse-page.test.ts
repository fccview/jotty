import { describe, it, expect } from "vitest";
import { Note } from "@/app/_types";
import { BrowseScope, BrowseSort } from "@/app/_consts/browse";
import { browseQueryOf, pageOfItems } from "@/app/_server/actions/browse/page";

const note = (index: number, category = "Work"): Note => ({
  id: `n${index}`,
  uuid: `u${index}`,
  title: `Note ${String(index).padStart(2, "0")}`,
  content: "",
  category,
  createdAt: "",
  updatedAt: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
});

const NOTES = Array.from({ length: 30 }, (_, index) => note(index, index % 3 ? "Work" : "Work/Deep"));
const query = (raw: Record<string, unknown> = {}) => browseQueryOf(BrowseScope.NOTES, raw, "all");

describe("pageOfItems", () => {
  it("serves one page, newest first, with the full total and filter counts", () => {
    const page = pageOfItems(BrowseScope.NOTES, NOTES, ["u3", "u4"], query());

    expect(page.pageItems.map((entry) => entry.uuid)).toEqual(
      Array.from({ length: 12 }, (_, index) => `u${29 - index}`),
    );
    expect(page.nextItems[0].uuid).toBe("u17");
    expect(page.total).toBe(30);
    expect(page.counts).toEqual({ all: 30, recent: 30, pinned: 2 });
    expect(page).toMatchObject({ size: 30, pinned: 2, kicker: { notes: 30, pinned: 2 } });
  });

  it("filters to pinned notes", () => {
    const page = pageOfItems(BrowseScope.NOTES, NOTES, ["u3", "u4"], query({ filter: "pinned" }));
    expect(page.pageItems.map((entry) => entry.uuid)).toEqual(["u4", "u3"]);
  });

  it("scopes to folders, with or without what is nested inside them", () => {
    const shallow = pageOfItems(BrowseScope.NOTES, NOTES, [], query({ categories: ["Work"] }));
    const deep = pageOfItems(BrowseScope.NOTES, NOTES, [], query({ categories: ["Work"], recursive: true }));
    expect(shallow.total).toBe(20);
    expect(deep.total).toBe(30);
  });

  it("clamps a page past the end to the last page", () => {
    const page = pageOfItems(BrowseScope.NOTES, NOTES, [], query({ page: 9 }));
    expect(page.query.page).toBe(3);
    expect(page.pageItems).toHaveLength(6);
  });

  it("sorts alphabetically when asked", () => {
    const page = pageOfItems(BrowseScope.NOTES, NOTES, [], query({ sort: BrowseSort.AZ }));
    expect(page.pageItems[0].title).toBe("Note 00");
  });
});

describe("browseQueryOf", () => {
  it("falls back to safe values for anything it does not recognise", () => {
    expect(
      browseQueryOf(
        BrowseScope.NOTES,
        { filter: "nope", sort: "sideways", perPage: 7, page: -2, categories: ["A", 3], recursive: "yes" },
        "all",
      ),
    ).toEqual({
      filter: "all",
      categories: ["A"],
      recursive: false,
      sort: BrowseSort.UPDATED,
      perPage: 12,
      page: 1,
    });
  });
});
