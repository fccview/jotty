import { describe, it, expect } from "vitest";
import {
  findDropList,
  projectIndex,
  displaceFor,
} from "@/app/_utils/dnd/dnd-math";
import { CARD_GAP_PX } from "@/app/_consts/dnd";
import { DragRect, ListItemRect } from "@/app/_types/dnd";

const makeRect = (
  top: number,
  left: number,
  width = 280,
  height = 80,
): DragRect => ({ top, left, width, height });

const makeColumn = (ids: string[], top = 0): ListItemRect[] =>
  ids.map((id, index) => ({
    id,
    index,
    rect: makeRect(top + index * (80 + CARD_GAP_PX), 0),
  }));

describe("findDropList", () => {
  const lists = new Map<string, DragRect>([
    ["todo", makeRect(0, 0)],
    ["in_progress", makeRect(0, 300)],
    ["completed", makeRect(0, 600)],
  ]);

  it("returns the list containing the pointer", () => {
    expect(findDropList({ x: 350, y: 40 }, lists)).toBe("in_progress");
  });

  it("falls back to the horizontally nearest list in dead zones", () => {
    expect(findDropList({ x: 295, y: 40 }, lists)).toBe("in_progress");
    expect(findDropList({ x: 285, y: 40 }, lists)).toBe("todo");
  });

  it("returns null when the pointer has no vertical overlap", () => {
    expect(findDropList({ x: 295, y: 500 }, lists)).toBeNull();
  });

  it("returns null for an empty registry", () => {
    expect(findDropList({ x: 10, y: 10 }, new Map())).toBeNull();
  });
});

describe("projectIndex", () => {
  it("returns 0 for an empty list", () => {
    expect(projectIndex(100, [], "x")).toBe(0);
  });

  it("returns 0 when the pointer is above the first midpoint", () => {
    const items = makeColumn(["a", "b", "c"]);
    expect(projectIndex(10, items, "x")).toBe(0);
  });

  it("returns the slot between two midpoints", () => {
    const items = makeColumn(["a", "b", "c"]);
    expect(projectIndex(50, items, "x")).toBe(1);
    expect(projectIndex(140, items, "x")).toBe(2);
  });

  it("returns the length when below all midpoints", () => {
    const items = makeColumn(["a", "b", "c"]);
    expect(projectIndex(900, items, "x")).toBe(3);
  });

  it("excludes the active card from counting", () => {
    const items = makeColumn(["a", "b", "c"]);
    expect(projectIndex(50, items, "a")).toBe(0);
    expect(projectIndex(900, items, "b")).toBe(2);
  });
});

describe("displaceFor", () => {
  const dragHeight = 80;
  const delta = dragHeight + CARD_GAP_PX;

  it("returns 0 when there is no target", () => {
    expect(displaceFor(0, 1, null, dragHeight)).toBe(0);
  });

  it("shifts cards up when dragging down in the same list", () => {
    expect(displaceFor(0, 0, 2, dragHeight)).toBe(-delta);
    expect(displaceFor(1, 0, 2, dragHeight)).toBe(-delta);
    expect(displaceFor(2, 0, 2, dragHeight)).toBe(0);
  });

  it("shifts cards down when dragging up in the same list", () => {
    expect(displaceFor(0, 2, 0, dragHeight)).toBe(delta);
    expect(displaceFor(1, 2, 0, dragHeight)).toBe(delta);
    expect(displaceFor(2, 2, 0, dragHeight)).toBe(0);
  });

  it("leaves cards alone when the target equals the source slot", () => {
    expect(displaceFor(0, 1, 1, dragHeight)).toBe(0);
    expect(displaceFor(1, 1, 1, dragHeight)).toBe(0);
  });

  it("shifts cards at or below the slot in a foreign list", () => {
    expect(displaceFor(0, null, 1, dragHeight)).toBe(0);
    expect(displaceFor(1, null, 1, dragHeight)).toBe(delta);
    expect(displaceFor(2, null, 1, dragHeight)).toBe(delta);
  });
});
