import fs from "fs/promises";
import path from "path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import { visit } from "unist-util-visit";
import type { Root, Text } from "mdast";
import { CHECKLIST_PIPE, WIKILINK_REGEX } from "@/app/_consts/relations";
import { ItemTypes, Modes } from "@/app/_types/enums";
import { isEncrypted } from "@/app/_utils/encryption-utils";
import { splitFrontmatter } from "@/app/_utils/yaml-metadata-utils";
import { serverWriteFile } from "@/app/_server/actions/file";
import { itemLane, runQueued } from "@/app/_server/actions/lib/concurrency";
import { isWritable } from "@/app/_server/actions/lib/read-only";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { isEmbed, titleKey } from "./parser";
import type { Relink } from "./indexer";

interface Swap {
  start: number;
  end: number;
  to: string;
}

const SEGMENT_SEPARATOR = " | ";
const DESCRIPTION_SEGMENT = "description:";
const CHECKLIST_LINE = /^\s*- \[[ xX]\] /;

const processor = unified().use(remarkParse);

export const renameWikis = (markdown: string, renames: Map<string, string>): string => {
  if (!markdown.includes("[[")) return markdown;

  let tree: Root;
  try {
    tree = processor.parse(markdown) as Root;
  } catch (error) {
    console.error("Could not parse markdown to relink wikilinks:", error);
    return markdown;
  }

  const swaps: Swap[] = [];
  visit(tree, "text", (node: Text) => {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start === undefined || end === undefined) return;
    const raw = markdown.slice(start, end);
    for (const match of Array.from(raw.matchAll(WIKILINK_REGEX))) {
      const to = renames.get(titleKey(match[1]));
      const at = start + match.index;
      if (!to || isEmbed(markdown, at)) continue;
      swaps.push({ start: at + 2, end: at + 2 + match[1].length, to });
    }
  });

  return swaps
    .sort((a, b) => b.start - a.start)
    .reduce((text, swap) => text.slice(0, swap.start) + swap.to + text.slice(swap.end), markdown);
};

const _escaped = (segment: string, renames: Map<string, string>): string =>
  renameWikis(segment.replace(CHECKLIST_PIPE, "|"), renames).replace(/\|/g, "∣");

const _checklistLine = (line: string, renames: Map<string, string>): string => {
  if (!CHECKLIST_LINE.test(line) || !line.includes("[[")) return line;
  const marker = line.match(CHECKLIST_LINE)![0];
  const [text, ...segments] = line.slice(marker.length).split(SEGMENT_SEPARATOR);
  const renamed = segments.map((segment) =>
    segment.startsWith(DESCRIPTION_SEGMENT)
      ? DESCRIPTION_SEGMENT + _escaped(segment.slice(DESCRIPTION_SEGMENT.length), renames)
      : segment,
  );
  return [marker + _escaped(text, renames), ...renamed].join(SEGMENT_SEPARATOR);
};

export const renameChecklistWikis = (body: string, renames: Map<string, string>): string =>
  body
    .split("\n")
    .map((line) => _checklistLine(line, renames))
    .join("\n");

const _rewrite = async (relinks: Relink[]): Promise<boolean> => {
  const [{ path: filePath, type }] = relinks;
  if (!(await isWritable(path.dirname(filePath)))) {
    console.warn(`Read-only folder, could not relink wikilinks in ${filePath}`);
    return false;
  }

  const raw = await fs.readFile(filePath, "utf-8");
  const { prefix, body } = splitFrontmatter(raw);
  if (isEncrypted(body)) return false;

  const renames = new Map(relinks.map((relink) => [relink.from, relink.to]));
  const next =
    type === ItemTypes.CHECKLIST ? renameChecklistWikis(body, renames) : renameWikis(body, renames);
  if (next === body) return false;

  await serverWriteFile(filePath, prefix + next);
  return true;
};

const _relinkSource = async (relinks: Relink[]) => {
  const [{ src, type, owner, path: filePath }] = relinks;
  const mode = type === ItemTypes.CHECKLIST ? Modes.CHECKLISTS : Modes.NOTES;
  try {
    const changed = await runQueued(itemLane(mode, src), () => _rewrite(relinks));
    if (!changed) return;
    await broadcast({
      type: type === ItemTypes.CHECKLIST ? "checklist" : "note",
      action: "updated",
      entityId: src,
      username: owner,
    });
  } catch (error) {
    console.error(`Could not relink wikilinks in ${filePath}:`, error);
  }
};

export const relinkSources = async (relinks: Relink[]): Promise<void> => {
  const bySource = new Map<string, Relink[]>();
  relinks.forEach((relink) => bySource.set(relink.src, [...(bySource.get(relink.src) || []), relink]));
  await Promise.all(Array.from(bySource.values()).map(_relinkSource));
};
