import { describe, it, expect } from "vitest";
import {
  MenuAlign,
  MenuSide,
  menuPlacementClasses,
  placeMenu,
} from "@/app/_utils/menu-placement-utils";

const bounds = { top: 60, left: 0, right: 400, bottom: 800 };
const menu = { width: 200, height: 180 };
const preferred = { side: MenuSide.Down, align: MenuAlign.Start };

const anchorAt = (top: number, left: number) => ({
  top,
  left,
  right: left + 32,
  bottom: top + 32,
});

describe("placeMenu", () => {
  it("keeps the preferred placement when it fits", () => {
    expect(placeMenu(anchorAt(100, 20), menu, bounds, preferred)).toEqual(
      preferred,
    );
  });

  it("flips left when the rightmost anchor would overflow", () => {
    expect(placeMenu(anchorAt(100, 360), menu, bounds, preferred).align).toBe(
      MenuAlign.End,
    );
  });

  it("flips right when an end aligned menu would overflow the left edge", () => {
    expect(
      placeMenu(anchorAt(100, 10), menu, bounds, {
        side: MenuSide.Down,
        align: MenuAlign.End,
      }).align,
    ).toBe(MenuAlign.Start);
  });

  it("flips up when there is no room below", () => {
    expect(placeMenu(anchorAt(700, 20), menu, bounds, preferred).side).toBe(
      MenuSide.Up,
    );
  });

  it("opens down instead of up under the header", () => {
    expect(
      placeMenu(anchorAt(120, 20), menu, bounds, {
        side: MenuSide.Up,
        align: MenuAlign.Start,
      }).side,
    ).toBe(MenuSide.Down);
  });

  it("stays down when neither side fits but below is roomier", () => {
    const tight = { ...bounds, bottom: 320 };
    expect(placeMenu(anchorAt(150, 20), menu, tight, preferred).side).toBe(
      MenuSide.Down,
    );
  });

  it("builds tailwind classes for each placement", () => {
    expect(
      menuPlacementClasses({ side: MenuSide.Up, align: MenuAlign.End }),
    ).toBe("bottom-full mb-1 right-0");
    expect(menuPlacementClasses(preferred)).toBe("top-full mt-1 left-0");
  });
  it.each([
    [20, 100, MenuSide.Down, MenuAlign.Start],
    [20, 760, MenuSide.Up, MenuAlign.Start],
    [390, 100, MenuSide.Down, MenuAlign.End],
    [390, 760, MenuSide.Up, MenuAlign.End],
  ] as const)("places a cursor anchor at (%i, %i)", (x, y, side, align) => {
    expect(
      placeMenu({ top: y, bottom: y, left: x, right: x }, menu, bounds, preferred),
    ).toEqual({ side, align });
  });
});
