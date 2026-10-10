import type { Root, Html, Parents, RootContent } from "mdast";
import type { VFile } from "vfile";
import { visit, SKIP } from "unist-util-visit";
import {
  KNOWN_BLOCK_HTML,
  KNOWN_INLINE_TAGS,
  RawAttr,
  INLINE_ATTRIBUTES,
  SPAN_MARKERS,
  SPAN_STYLES,
  VOID_INLINE_TAGS,
} from "@/app/_utils/markdown/consts";

const RAW_BLOCK_TYPES = new Set(["definition", "footnoteDefinition"]);
const RAW_INLINE_TYPES = new Set([
  "footnoteReference",
  "linkReference",
  "imageReference",
]);
const BLOCK_PARENTS = new Set(["root", "listItem", "blockquote", "footnoteDefinition"]);

const escapeAttr = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export const rawBlockHtml = (source: string) =>
  `<div ${RawAttr.Block}="" ${RawAttr.Source}="${escapeAttr(source)}"></div>`;

export const rawInlineHtml = (source: string) =>
  `<span ${RawAttr.Inline}="" ${RawAttr.Source}="${escapeAttr(source)}"></span>`;

const tagName = (html: string) =>
  html.match(/^<\/?([a-zA-Z][\w-]*)/)?.[1]?.toLowerCase() ?? null;

const isClosing = (html: string) => /^<\//.test(html);

const sliceOf = (node: RootContent, source: string) => {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  return start === undefined || end === undefined ? "" : source.slice(start, end);
};

const asHtml = (value: string): Html => ({ type: "html", value });

interface Attribute {
  name: string;
  value: string;
}

const ATTRIBUTE = /([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

const attributesOf = (html: string): Attribute[] => {
  const inside = html.match(/^<[a-zA-Z][\w-]*([^>]*)>/)?.[1] ?? "";
  return Array.from(inside.matchAll(ATTRIBUTE), (match) => ({
    name: match[1].toLowerCase(),
    value: match[2] ?? match[3] ?? match[4] ?? "",
  }));
};

const styleProps = (style: string) =>
  style
    .split(";")
    .map((rule) => rule.split(":")[0].trim().toLowerCase())
    .filter(Boolean);

const keepsAttribute = (tag: string, { name, value }: Attribute) => {
  if (!(INLINE_ATTRIBUTES[tag] ?? []).includes(name)) return false;
  if (tag !== "span" || name !== "style") return true;
  const props = styleProps(value);
  return props.length > 0 && props.every((prop) => SPAN_STYLES.has(prop));
};

const knownOpening = (tag: string, html: string) => {
  const attributes = attributesOf(html);
  if (!attributes.every((attribute) => keepsAttribute(tag, attribute))) return false;
  return tag !== "span" || attributes.some((attribute) => SPAN_MARKERS.includes(attribute.name));
};

const selfContained = (tag: string, html: string) =>
  VOID_INLINE_TAGS.has(tag) || /\/>\s*$/.test(html) || new RegExp(`</${tag}\\s*>\\s*$`, "i").test(html);

interface OpenTag {
  tag: string;
  node: RootContent;
  known: boolean;
}

const inlineTag = (node: RootContent) => {
  if (node.type !== "html") return null;
  const tag = tagName(node.value);
  return tag && (tag === "span" || KNOWN_INLINE_TAGS.has(tag)) ? tag : null;
};

const pairedInline = (parent: Parents) => {
  const known = new Set<RootContent>();
  const open: OpenTag[] = [];
  parent.children.forEach((child) => {
    const tag = inlineTag(child as RootContent);
    if (!tag) return;
    const html = (child as Html).value;
    if (isClosing(html)) {
      const top = open[open.length - 1];
      if (top?.tag !== tag) return;
      open.pop();
      if (top.known) [top.node, child as RootContent].forEach((node) => known.add(node));
      return;
    }
    const opening = knownOpening(tag, html);
    if (selfContained(tag, html)) {
      if (opening) known.add(child as RootContent);
      return;
    }
    open.push({ tag, node: child as RootContent, known: opening });
  });
  return known;
};

export const CONTEXT_START = "contextStart";

export const remarkRawFallback = () => (tree: Root, file: VFile) => {
  const source = String(file.value);
  const contextStart = Number(file.data[CONTEXT_START] ?? Infinity);
  tree.children = tree.children.filter(
    (child) =>
      !RAW_BLOCK_TYPES.has(child.type) || (child.position?.start.offset ?? 0) < contextStart,
  );
  const pairs = new Map<Parents, Set<RootContent>>();

  visit(tree, (node, index, parent) => {
    if (!parent || index === undefined) return;
    const child = node as RootContent;

    if (RAW_BLOCK_TYPES.has(child.type)) {
      parent.children[index] = asHtml(rawBlockHtml(sliceOf(child, source)));
      return SKIP;
    }

    if (RAW_INLINE_TYPES.has(child.type)) {
      parent.children[index] = asHtml(rawInlineHtml(sliceOf(child, source)));
      return SKIP;
    }

    if (child.type !== "html") return;

    if (BLOCK_PARENTS.has(parent.type)) {
      if (!KNOWN_BLOCK_HTML.test(child.value)) {
        parent.children[index] = asHtml(rawBlockHtml(child.value));
      }
      return SKIP;
    }

    const known = pairs.get(parent) ?? pairedInline(parent);
    pairs.set(parent, known);
    if (!known.has(child)) {
      parent.children[index] = asHtml(rawInlineHtml(child.value));
    }
    return SKIP;
  });
};
