import { describe, it, expect } from "vitest";
import { findOnShelf } from "@/app/_utils/catalog-utils";

const shelf = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => ({ uuid: `${prefix}${index}`, title: `${prefix} ${index}` }));

describe("findOnShelf", () => {
  it("leaves room for checklists when notes alone would fill the limit", () => {
    const found = findOnShelf(shelf("note", 300), shelf("list", 40), "", { limit: 50 });
    expect(found.notes).toHaveLength(25);
    expect(found.checklists).toHaveLength(25);
  });

  it("gives notes the room checklists don't need", () => {
    const found = findOnShelf(shelf("note", 300), shelf("list", 4), "", { limit: 50 });
    expect(found.notes).toHaveLength(46);
    expect(found.checklists).toHaveLength(4);
  });

  it("gives checklists the room notes don't need", () => {
    const found = findOnShelf(shelf("note", 3), shelf("list", 300), "", { limit: 50 });
    expect(found.notes).toHaveLength(3);
    expect(found.checklists).toHaveLength(47);
  });

  it("matches folders only when asked", () => {
    const notes = [{ uuid: "a", title: "Cake", category: "Recipes" }];
    expect(findOnShelf(notes, [], "recipes", { limit: 5 }).notes).toEqual([]);
    expect(findOnShelf(notes, [], "recipes", { limit: 5, byCategory: true }).notes).toEqual(notes);
  });
});
