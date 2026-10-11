import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";

const STRICT_TABLE_PARENTS = new Set([
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "colgroup",
]);

const isBlankText = (node: Element["children"][number]) =>
  node.type === "text" && !node.value.trim();

export const rehypeTableWhitespace = () => (tree: Root) => {
  visit(tree, "element", (node: Element) => {
    if (!STRICT_TABLE_PARENTS.has(node.tagName)) return;
    node.children = node.children.filter((child) => !isBlankText(child));
  });
};
