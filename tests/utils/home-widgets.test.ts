import { describe, it, expect } from "vitest";
import { pickUpItem } from "@/app/_utils/home-widgets";

const items = [
  { uuid: "old", updatedAt: "2026-01-01T00:00:00.000Z", isBoard: false },
  { uuid: "board", updatedAt: "2026-03-01T00:00:00.000Z", isBoard: true },
  { uuid: "mid", updatedAt: "2026-02-01T00:00:00.000Z", isBoard: false },
];

const notBoard = (item: (typeof items)[number]) => !item.isBoard;

describe("pickUpItem", () => {
  it("picks the newest item when the widget is shown", () => {
    expect(pickUpItem(items, true)?.uuid).toBe("board");
  });

  it("prefers matching items over newer ones", () => {
    expect(pickUpItem(items, true, notBoard)?.uuid).toBe("mid");
  });

  it("falls back to the newest item when nothing matches", () => {
    expect(pickUpItem(items, true, () => false)?.uuid).toBe("board");
  });

  it("picks nothing when the widget is hidden so recent keeps the newest item", () => {
    expect(pickUpItem(items, false)).toBeUndefined();
    expect(pickUpItem(items, false, notBoard)).toBeUndefined();
  });

  it("keeps the first item when timestamps tie", () => {
    const tied = [
      { uuid: "first", updatedAt: "2026-04-01T00:00:00.000Z" },
      { uuid: "second", updatedAt: "2026-04-01T00:00:00.000Z" },
    ];
    expect(pickUpItem(tied, true)?.uuid).toBe("first");
  });

  it("picks nothing from an empty library", () => {
    expect(pickUpItem([], true)).toBeUndefined();
  });

  it("does not reorder the input", () => {
    pickUpItem(items, true);
    expect(items.map(({ uuid }) => uuid)).toEqual(["old", "board", "mid"]);
  });
});
