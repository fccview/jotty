import { createDocument, getHTMLFromFragment } from "@tiptap/core";
import { Fragment, type Node as PmNode, type Schema } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import { fixTables } from "@tiptap/pm/tables";
import { keyOf, saveBlocks, type Block, type HtmlToNodes, type MarkdownSnapshot } from "./session";
import type { NodeJson, SerializeOptions } from "./serialize/types";
import type { TableSyntax } from "@/app/_types";

const DEFAULT_SPANS = ["colspan", "rowspan"];

const TABLE_TAG = /<table[\s>]/i;

const tidyDoc = (doc: PmNode) => fixTables(EditorState.create({ doc }))?.doc ?? doc;

const parsers = new WeakMap<Schema, HtmlToNodes>();
const blocks = new WeakMap<PmNode, Block>();

export const htmlToNodes = (schema: Schema): HtmlToNodes => {
  const known = parsers.get(schema);
  if (known) return known;
  const parse: HtmlToNodes = (html) => {
    if (!html.trim()) return [];
    const parsed = createDocument(html, schema);
    const doc = (TABLE_TAG.test(html) ? tidyDoc(parsed) : parsed).toJSON() as NodeJson;
    return doc.content ?? [];
  };
  parsers.set(schema, parse);
  return parse;
};

const blockOf = (node: PmNode): Block => {
  const known = blocks.get(node);
  if (known) return known;
  const json = node.toJSON() as NodeJson;
  const block = { json, key: keyOf(json) };
  blocks.set(node, block);
  return block;
};

export const docToMarkdown = (
  doc: PmNode,
  snapshot: MarkdownSnapshot | null,
  tableSyntax?: TableSyntax,
) => {
  const children: Block[] = [];
  doc.forEach((child) => {
    children.push(blockOf(child));
  });
  return saveBlocks(children, snapshot, serializeOptions(doc.type.schema, tableSyntax));
};

const tidyTable = (html: string) => {
  const host = document.createElement("div");
  host.innerHTML = html;
  host.querySelectorAll("th, td").forEach((cell) => {
    DEFAULT_SPANS.forEach((name) => {
      if (cell.getAttribute(name) === "1") cell.removeAttribute(name);
    });
    const only = cell.children.length === 1 ? cell.children[0] : null;
    if (only?.tagName === "P" && !only.attributes.length && cell.childNodes.length === 1) {
      cell.innerHTML = only.innerHTML;
    }
  });
  host.querySelectorAll("colgroup").forEach((group) => {
    const sized = Array.from(group.querySelectorAll("col")).some((col) => /(^|;)\s*width/.test(col.getAttribute("style") || ""));
    if (!sized) group.remove();
  });
  host.querySelectorAll("table").forEach((table) => {
    if (/^\s*min-width:[^;]*;?\s*$/.test(table.getAttribute("style") || "")) table.removeAttribute("style");
  });
  return host.innerHTML;
};

export const serializeOptions = (schema: Schema, tableSyntax?: TableSyntax): SerializeOptions => ({
  tableSyntax,
  renderHtml: (node) => tidyTable(getHTMLFromFragment(Fragment.from(schema.nodeFromJSON(node)), schema)),
});
