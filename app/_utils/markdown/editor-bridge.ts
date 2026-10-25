import { DOMParser, DOMSerializer, Fragment, type Node as PmNode, type Schema } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import { fixTables } from "@tiptap/pm/tables";
import { keyOf, saveBlocks, type Block, type HtmlToNodes, type MarkdownSnapshot } from "./session";
import type { NodeJson, SerializeOptions } from "./serialize/types";
import { bodyFrom, browserKit, type DomKit } from "./dom-kit";
import type { TableSyntax } from "@/app/_types";

const DEFAULT_SPANS = ["colspan", "rowspan"];

const TABLE_TAG = /<table[\s>]/i;

const tidyDoc = (doc: PmNode) => fixTables(EditorState.create({ doc }))?.doc ?? doc;

const parsers = new WeakMap<Schema, HtmlToNodes>();
const blocks = new WeakMap<PmNode, Block>();

const parseWith = (schema: Schema, kitOf: () => DomKit): HtmlToNodes => (html) => {
  if (!html.trim()) return [];
  const parsed = DOMParser.fromSchema(schema).parse(bodyFrom(html, kitOf()));
  const doc = (TABLE_TAG.test(html) ? tidyDoc(parsed) : parsed).toJSON() as NodeJson;
  return doc.content ?? [];
};

export const htmlToNodes = (schema: Schema, kit?: DomKit): HtmlToNodes => {
  if (kit) return parseWith(schema, () => kit);
  const known = parsers.get(schema);
  if (known) return known;
  const parse = parseWith(schema, browserKit);
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

const htmlOf = (node: NodeJson, schema: Schema, kit: DomKit) => {
  const host = kit.document.createElement("div");
  DOMSerializer.fromSchema(schema).serializeFragment(
    Fragment.from(schema.nodeFromJSON(node)),
    { document: kit.document },
    host,
  );
  return host.innerHTML;
};

const tidyTable = (html: string, kit: DomKit) => {
  const host = kit.document.createElement("div");
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

export const serializeOptions = (schema: Schema, tableSyntax?: TableSyntax, kit?: DomKit): SerializeOptions => ({
  tableSyntax,
  renderHtml: (node) => {
    const dom = kit ?? browserKit();
    return tidyTable(htmlOf(node, schema, dom), dom);
  },
});
