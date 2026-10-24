import type { Element, ElementContent, Root, RootContent, Text } from "hast";

export type HastParent = Root | Element;
export type HastChild = RootContent | ElementContent;

export interface HastRule {
  element?: (node: Element, parent: HastParent | undefined) => void;
  comment?: (node: HastChild & { type: "comment"; value: string }) => void;
}

export const isElement = (node: unknown, tag?: string): node is Element =>
  typeof node === "object" &&
  node !== null &&
  (node as Element).type === "element" &&
  (!tag || (node as Element).tagName === tag);

export const isText = (node: unknown): node is Text =>
  typeof node === "object" && node !== null && (node as Text).type === "text";

export const hasClass = (node: Element, className: string) => {
  const classList = node.properties?.className;
  if (Array.isArray(classList)) return classList.some((cn) => String(cn) === className);
  if (typeof classList === "string") return classList.split(" ").includes(className);
  return false;
};

export const textOf = (node: Element | Text): string =>
  isText(node)
    ? node.value
    : node.children.map((child) => (isElement(child) || isText(child) ? textOf(child) : "")).join("");

export const element = (
  tagName: string,
  properties: Element["properties"],
  children: ElementContent[] = [],
): Element => ({ type: "element", tagName, properties, children });
