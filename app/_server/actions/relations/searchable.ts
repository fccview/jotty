import path from "path";
import type { Item } from "@/app/_types";
import { ItemTypes } from "@/app/_types/enums";
import { parseMarkdown } from "@/app/_utils/checklist-utils";
import { readLinks, type ParsedLinks } from "./parser";

export interface Searchable {
  body: string;
  prose: string;
  extra: string;
}

const _itemLines = (items: Item[]): string[] =>
  items.flatMap((item) => [
    item.text,
    item.description || "",
    ..._itemLines(item.children || []),
  ]);

const _tags = (metadata: Record<string, unknown>): string[] =>
  Array.isArray(metadata.tags) ? metadata.tags.filter((tag) => typeof tag === "string") : [];

const _checklistText = (content: string, filePath: string, origins: string[]): ParsedLinks => {
  const id = path.basename(filePath, ".md");
  const { items } = parseMarkdown(content, id, "", undefined, false, undefined, filePath);
  return readLinks(_itemLines(items).filter(Boolean).join("\n\n"), origins);
};

export const searchableOf = (
  type: ItemTypes,
  parsed: ParsedLinks,
  content: string,
  filePath: string,
  metadata: Record<string, unknown>,
  origins: string[],
): Searchable => {
  const source = type === ItemTypes.CHECKLIST ? _checklistText(content, filePath, origins) : parsed;
  return {
    body: source.readable,
    prose: source.text,
    extra: _tags(metadata).join(" "),
  };
};
