import { MARKDOWN_EDITOR_CLASS } from "@/app/_utils/markdown-editor-utils";

export interface ReadingAnchor {
  text: string;
  occurrence: number;
  offset: number;
  ratio: number;
  progress: number | null;
}

const HEADINGS = "h1, h2, h3, h4, h5, h6, .token.title";
const EDITABLE = `.ProseMirror, .${MARKDOWN_EDITOR_CLASS}`;
const SCROLLABLE = /(auto|scroll)/;
const HEADING_MARKS = /^#{1,6}\s*|\s*#+$/g;

const headingText = (el: Element) =>
  (el.textContent || "").replace(/\s+/g, " ").trim().replace(HEADING_MARKS, "");

export const surfaceOf = (root: HTMLElement) =>
  root.querySelector<HTMLElement>(EDITABLE) ?? root;

const canScroll = (el: HTMLElement) =>
  SCROLLABLE.test(getComputedStyle(el).overflowY);

export const findScroller = (el: HTMLElement | null) => {
  let fallback: HTMLElement | null = null;
  let node = el?.parentElement ?? null;
  while (node) {
    if (canScroll(node)) {
      if (node.scrollHeight > node.clientHeight) return node;
      fallback ??= node;
    }
    node = node.parentElement;
  }
  return fallback;
};

const scrollRange = (scroller: HTMLElement) =>
  scroller.scrollHeight - scroller.clientHeight;

export const captureAnchor = (
  root: HTMLElement,
  scroller: HTMLElement
): ReadingAnchor | null => {
  const range = scrollRange(scroller);
  if (scroller.scrollTop <= 0 || range <= 0) return null;

  const top = scroller.getBoundingClientRect().top;
  const headings = Array.from(root.querySelectorAll<HTMLElement>(HEADINGS));
  const passed = headings.filter(
    (h) => h.getBoundingClientRect().top - top <= 1
  );
  const anchor = passed[passed.length - 1];
  const ratio = scroller.scrollTop / range;

  if (!anchor) return { text: "", occurrence: 0, offset: 0, ratio, progress: null };

  const text = headingText(anchor);
  const occurrence = passed.filter((h) => headingText(h) === text).length - 1;
  const anchorTop = anchor.getBoundingClientRect().top;
  const next = headings[passed.length];
  const span = next ? next.getBoundingClientRect().top - anchorTop : 0;
  return {
    text,
    occurrence,
    offset: top - anchorTop,
    ratio,
    progress: span > 0 ? (top - anchorTop) / span : null,
  };
};

const findHeading = (editable: HTMLElement, anchor: ReadingAnchor) => {
  if (!anchor.text) return {};
  const headings = Array.from(editable.querySelectorAll<HTMLElement>(HEADINGS));
  const heading = headings.filter((h) => headingText(h) === anchor.text)[anchor.occurrence];
  return heading ? { heading, next: headings[headings.indexOf(heading) + 1] } : {};
};

const offsetWithin = (heading: HTMLElement, next: HTMLElement | undefined, anchor: ReadingAnchor) => {
  if (anchor.progress === null || !next) return anchor.offset;
  const span = next.getBoundingClientRect().top - heading.getBoundingClientRect().top;
  return span > 0 ? anchor.progress * span : anchor.offset;
};

export const restoreAnchor = (
  root: HTMLElement,
  anchor: ReadingAnchor,
  allowRatio: boolean
) => {
  const editable = surfaceOf(root);
  const scroller = findScroller(editable);
  if (!scroller) return false;

  const { heading, next } = findHeading(editable, anchor);
  if (heading) {
    const delta =
      heading.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top;
    scroller.scrollTop += delta + offsetWithin(heading, next, anchor);
    return true;
  }

  const range = scrollRange(scroller);
  if (!allowRatio || range <= 0) return false;
  scroller.scrollTop = anchor.ratio * range;
  return true;
};
