"use client";

export const SCROLL_TOLERANCE = 1;
export const SCROLLABLE_OVERFLOW = ["auto", "scroll"];

const _hasXOverflow = (el: HTMLElement): boolean => {
  if (el.scrollWidth - el.clientWidth <= SCROLL_TOLERANCE) return false;

  const { overflowX } = window.getComputedStyle(el);
  return SCROLLABLE_OVERFLOW.includes(overflowX);
};

const _hasXRoomLeft = (el: HTMLElement, deltaX: number): boolean => {
  const maxScroll = el.scrollWidth - el.clientWidth;
  const scrolled = Math.abs(el.scrollLeft);

  return deltaX < 0
    ? scrolled < maxScroll - SCROLL_TOLERANCE
    : scrolled > SCROLL_TOLERANCE;
};

export const eatsSwipe = (
  target: EventTarget | null,
  deltaX: number,
  boundary?: HTMLElement | null,
): boolean => {
  if (typeof window === "undefined") return false;

  let node = target instanceof Element ? target : null;

  while (node && node !== boundary && node !== document.body) {
    if (
      node instanceof HTMLElement &&
      _hasXOverflow(node) &&
      _hasXRoomLeft(node, deltaX)
    ) {
      return true;
    }
    node = node.parentElement;
  }

  return false;
};
