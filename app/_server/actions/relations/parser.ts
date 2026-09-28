import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { SKIP, visit } from "unist-util-visit";
import type { Nodes, Root } from "mdast";
import { WIKILINK_REGEX } from "@/app/_consts/relations";
import { ItemHrefTarget, parseItemHref } from "@/app/_utils/item-href-utils";

export interface ParsedLinks {
  targets: ItemHrefTarget[];
  wikis: string[];
  text: string;
  readable: string;
}

const HTML_HREF_REGEX = /data-href="([^"]+)"/g;

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

export const readLinks = (markdown: string, origins: string[] = []): ParsedLinks => {
  const targets: ItemHrefTarget[] = [];
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

  const addHref = (href: string) => {
    const target = parseItemHref(href, origins);
    if (target) targets.push(target);
  };

  visit(tree, (node) => {
    if (node.type === "link") {
      addHref(node.url);
      readable.push(_plain(node));
      return SKIP;
    }
    if (node.type === "linkReference") return SKIP;
    if (node.type === "definition") {
      addHref(node.url);
    } else if (node.type === "text") {
      wikis.push(..._wikis(node.value));
      prose.push(node.value.replace(WIKILINK_REGEX, " "));
      readable.push(node.value.replace(WIKILINK_REGEX, (_, target, shown) => shown || target));
    } else if (node.type === "html") {
      Array.from(node.value.matchAll(HTML_HREF_REGEX), (match) => addHref(match[1]));
    }
  });

  return { targets, wikis, text: _squash(prose), readable: _squash(readable) };
};
