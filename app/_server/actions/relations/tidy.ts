import { unified } from "unified";
import remarkParse from "remark-parse";
import { SKIP, visit } from "unist-util-visit";
import type { Link, Root } from "mdast";
import { WIKILINK_REGEX } from "@/app/_consts/relations";
import { ItemTypes, Modes } from "@/app/_types/enums";
import { itemHref } from "@/app/_utils/global-utils";
import { parseItemHref } from "@/app/_utils/item-href-utils";
import { relationsDb } from "./store";

interface Rewrite {
  start: number;
  end: number;
  from: string;
  to: string;
}

const processor = unified().use(remarkParse);

const _typeOf = (uuid: string): ItemTypes | null => {
  try {
    const row = relationsDb()
      .prepare("SELECT type FROM items WHERE uuid = ?")
      .get(uuid) as { type?: string } | undefined;
    if (row?.type === ItemTypes.NOTE || row?.type === ItemTypes.CHECKLIST) return row.type;
  } catch (error) {
    console.error("Relations could not resolve link type:", error);
  }
  return null;
};

const _legacyUuid = async (
  type: ItemTypes,
  category: string,
  id: string,
  owner: string,
): Promise<string | null> => {
  const { legacyResolve } = await import("@/app/_server/actions/lib/legacy-lookup");
  const mode = type === ItemTypes.CHECKLIST ? Modes.CHECKLISTS : Modes.NOTES;
  return legacyResolve(mode, category, id, owner);
};

const _canonical = async (url: string, owner: string): Promise<string | null> => {
  const target = parseItemHref(url);
  if (!target) return null;

  if (target.uuid) {
    const type = _typeOf(target.uuid);
    if (!type || type === target.type) return null;
    return itemHref(type, target.uuid);
  }

  if (target.legacy && target.type) {
    const uuid = await _legacyUuid(target.type, target.legacy.category, target.legacy.id, owner);
    return uuid ? itemHref(target.type, uuid) : null;
  }

  return null;
};

export const tidyItemLinks = async (markdown: string, owner: string): Promise<string> => {
  if (!markdown.includes("](")) return markdown;

  let tree: Root;
  try {
    tree = processor.parse(markdown) as Root;
  } catch (error) {
    console.error("Could not parse markdown to tidy links:", error);
    return markdown;
  }

  const links: Link[] = [];
  visit(tree, "link", (node: Link) => {
    links.push(node);
  });

  const rewrites: Rewrite[] = [];
  for (const link of links) {
    const start = link.position?.start.offset;
    const end = link.position?.end.offset;
    if (start === undefined || end === undefined) continue;

    const to = await _canonical(link.url, owner);
    if (to) rewrites.push({ start, end, from: link.url, to });
  }

  return rewrites.reverse().reduce((text, rewrite) => {
    const source = text.slice(rewrite.start, rewrite.end);
    const at = source.lastIndexOf(`(${rewrite.from}`);
    if (at === -1) return text;

    const fixed =
      source.slice(0, at + 1) + rewrite.to + source.slice(at + 1 + rewrite.from.length);
    return text.slice(0, rewrite.start) + fixed + text.slice(rewrite.end);
  }, markdown);
};

const _escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const _mentionRegex = (title: string): RegExp =>
  new RegExp(
    `(?<![\\p{L}\\p{N}])${title.trim().split(/\s+/).map(_escapeRegex).join("\\s+")}(?![\\p{L}\\p{N}])`,
    "iu",
  );

const _insideWikilink = (raw: string, at: number): boolean =>
  Array.from(raw.matchAll(WIKILINK_REGEX)).some(
    (match) => match.index !== undefined && at >= match.index && at < match.index + match[0].length,
  );

export const wrapMention = (markdown: string, title: string, href: string): string | null => {
  let tree: Root;
  try {
    tree = processor.parse(markdown) as Root;
  } catch (error) {
    console.error("Could not parse markdown to link a mention:", error);
    return null;
  }

  const phrase = _mentionRegex(title);
  let found: { start: number; end: number; text: string } | null = null;

  visit(tree, (node) => {
    if (found) return SKIP;
    if (node.type === "link" || node.type === "linkReference") return SKIP;
    if (node.type !== "text") return;
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start === undefined || end === undefined) return;

    const raw = markdown.slice(start, end);
    const match = phrase.exec(raw);
    if (!match || _insideWikilink(raw, match.index)) return;
    found = { start: start + match.index, end: start + match.index + match[0].length, text: match[0] };
    return SKIP;
  });

  if (!found) return null;
  const { start, end, text } = found as { start: number; end: number; text: string };
  const label = text.replace(/[\[\]]/g, "\\$&");
  return `${markdown.slice(0, start)}[${label}](${href})${markdown.slice(end)}`;
};
