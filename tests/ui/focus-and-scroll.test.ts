// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { isPageScroller } from "@/app/_utils/global-utils";

const PAGE = "jotty-scrollable-content";

describe("isPageScroller", () => {
  it("accepts the main page scroller", () => {
    const page = document.createElement("div");
    page.className = PAGE;

    expect(isPageScroller(page, PAGE)).toBe(true);
  });

  it("ignores scrollers inside a dialog", () => {
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    const body = document.createElement("div");
    body.className = PAGE;
    dialog.appendChild(body);

    expect(isPageScroller(body, PAGE)).toBe(false);
  });

  it("ignores self-contained scrollers like the tags tile", () => {
    const tile = document.createElement("div");
    tile.className = `${PAGE} overscroll-contain`;

    expect(isPageScroller(tile, PAGE)).toBe(false);
  });

  it("ignores anything without the page class", () => {
    expect(isPageScroller(document.createElement("div"), PAGE)).toBe(false);
  });
});
