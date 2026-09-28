import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { SKIP, visit } from "unist-util-visit";
import type { Nodes, Parents, Root } from "mdast";
import { LinkKinds, WIKILINK_REGEX } from "@/app/_consts/relations";
import { ItemHrefTarget, parseItemHref } from "@/app/_utils/item-href-utils";

export interface LinkTarget extends ItemHrefTarget {
  kind: LinkKinds;
}

export interface ParsedLinks {
  targets: LinkTarget[];
  wikis: string[];
  text: string;
  readable: string;
}

const HTML_HREF_REGEX = /data-href="([^"]+)"/g;
const BLOCKS = new Set<string>(["paragraph", "heading", "tableCell"]);

const processor = unified().use(remarkParse).use(remarkGfm);

export const titleKey = (title: string): string =>
  title.trim().replace(/\s+/g, " ").toLowerCase();

const _plain = (node: Nodes): string => {
  if ("value" in node && node.type !== "html") return node.value;
  if ("children" in node) return node.children.map(_plain).join(" ");
  return "";
};

const _squash = (parts: string[]) => parts.join(" ").replace(/\s+/g, " ").trim();

const _wikis = (text: string): string[] =>
  Array.from(text.matchAll(WIKILINK_REGEX), (m) => m[1].trim()).filter(
    Boolean,
  );

const _lineage = (node: Nodes, parents: Map<Nodes, Parents>): Parents[] => {
  const line: Parents[] = [];
  for (let up = parents.get(node); up; up = parents.get(up)) line.push(up);
  return line;
};

const _kindOf = (node: Nodes, parents: Map<Nodes, Parents>): LinkKinds => {
  const line = _lineage(node, parents);
  const task = line.find((up) => up.type === "listItem");
  if (task?.type === "listItem" && typeof task.checked === "boolean") return LinkKinds.CHECKLIST;

  const block = line.find((up) => BLOCKS.has(up.type));
  if (!block) return LinkKinds.LINK;
  return _squash([_plain(block)]) === _squash([_plain(node)]) ? LinkKinds.LINK : LinkKinds.MENTION;
};

export const readLinks = (markdown: string, origins: string[] = []): ParsedLinks => {
  const targets: LinkTarget[] = [];
  const wikis: string[] = [];
  const prose: string[] = [];
  const readable: string[] = [];
  const empty = { targets, wikis, text: "", readable: "" };
  if (!markdown.trim()) return empty;

  let tree: Root;
  try {
    tree = processor.parse(markdown) as Root;
  } catch (error) {
    console.error("Relations parser could not read markdown:", error);
    return empty;
  }

  const parents = new Map<Nodes, Parents>();
  const addHref = (href: string, node: Nodes) => {
    const target = parseItemHref(href, origins);
    if (target) targets.push({ ...target, kind: _kindOf(node, parents) });
  };

  visit(tree, (node, _index, parent) => {
    if (parent) parents.set(node, parent);
    if (node.type === "link") {
      addHref(node.url, node);
      readable.push(_plain(node));
      return SKIP;
    }
    if (node.type === "linkReference") return SKIP;
    if (node.type === "definition") {
      addHref(node.url, node);
    } else if (node.type === "text") {
      wikis.push(..._wikis(node.value));
      prose.push(node.value.replace(WIKILINK_REGEX, " "));
      readable.push(node.value.replace(WIKILINK_REGEX, (_, target, shown) => shown || target));
    } else if (node.type === "html") {
      Array.from(node.value.matchAll(HTML_HREF_REGEX), (match) => addHref(match[1], node));
    }
  });

  return { targets, wikis, text: _squash(prose), readable: _squash(readable) };
};
