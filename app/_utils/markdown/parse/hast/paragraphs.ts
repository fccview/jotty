import type { Element, ElementContent } from "hast";
import { LEGACY_EMPTY_PARAGRAPH, NBSP, SOFT_BREAK_ATTR } from "@/app/_utils/markdown/consts";
import { element, isElement, isText, textOf } from "./types";

const PHRASING_PARENTS = new Set([
  "p", "h1", "h2", "h3", "h4", "h5", "h6", "th", "td", "li", "a", "strong", "em",
  "del", "s", "span", "mark", "u", "sub", "sup", "kbd", "abbr", "b", "i", "summary",
]);

const BLOCK_TAGS = new Set([
  "ul", "ol", "p", "pre", "blockquote", "table", "div", "details", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "img",
]);

const isInlineSibling = (node: ElementContent | undefined) =>
  node !== undefined && !(isElement(node) && BLOCK_TAGS.has(node.tagName));

const BLANK = new RegExp(`^[\\s${LEGACY_EMPTY_PARAGRAPH}${NBSP}]*$`);

export const emptyParagraph = (node: Element) => {
  if (node.tagName !== "p") return;
  if (!node.children.every((child) => isText(child))) return;
  const text = textOf(node);
  if (text && BLANK.test(text) && (text.includes(LEGACY_EMPTY_PARAGRAPH) || text.includes(NBSP))) {
    node.children = [];
  }
};

const softBreak = () => element("br", { [SOFT_BREAK_ATTR]: "" });

export const splitSoftBreaks = (node: Element) => {
  if (!PHRASING_PARENTS.has(node.tagName)) return;
  const next: ElementContent[] = [];
  node.children.forEach((child, index) => {
    const structural =
      isText(child) &&
      !child.value.trim() &&
      !(isInlineSibling(node.children[index - 1]) && isInlineSibling(node.children[index + 1]));
    if (!isText(child) || !child.value.includes("\n") || structural) {
      next.push(child);
      return;
    }
    const prev = node.children[index - 1];
    const following = node.children[index + 1];
    const lines = child.value.split("\n");
    if ((isElement(prev, "br") || !isInlineSibling(prev)) && lines[0].trim() === "") lines.shift();
    if (!isInlineSibling(following) && lines.length > 1 && lines[lines.length - 1].trim() === "") lines.pop();
    lines.forEach((line, lineIndex) => {
      if (lineIndex > 0) next.push(softBreak());
      if (line) next.push({ type: "text", value: line });
    });
  });
  const lastBreak = next.length > 0 && isElement(next[next.length - 1], "br") && (next[next.length - 1] as Element).properties?.[SOFT_BREAK_ATTR] !== undefined;
  if (lastBreak) next.pop();
  node.children = next;
};

export const dropBreakNewlines = (node: Element) => {
  node.children.forEach((child, index) => {
    if (!isText(child) || !isElement(node.children[index - 1], "br")) return;
    child.value = child.value.replace(/^\n/, "");
  });
};
