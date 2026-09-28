import { parseItemHref } from "@/app/_utils/item-href-utils";
import { dropLine, joinLines, lineAt, lineStart, splitLines } from "@/app/_utils/text-lines";

const ITEM_LINK = /\[((?:[^\[\]\\]|\\.)*)\]\(\s*([^()\s]+)(\s+"[^"]*")?\s*\)/g;
const CODE = /(```|~~~)[\s\S]*?\1|`[^`\r\n]+`/g;
const BARE_LINE = /^\s*(?:[-*+]\s+|\d+[.)]\s+)?$/;

export interface ItemLink {
  start: number;
  end: number;
  label: string;
  href: string;
}

const _codeRanges = (text: string): Array<[number, number]> =>
  Array.from(text.matchAll(CODE), (match): [number, number] => [match.index, match.index + match[0].length]);

const _inCode = (at: number, ranges: Array<[number, number]>): boolean =>
  ranges.some(([start, end]) => at >= start && at < end);

export const unescapeLabel = (label: string): string => label.replace(/\\(.)/g, "$1");

export const itemLinksTo = (text: string, uuid: string, origins: string[] = []): ItemLink[] => {
  const target = uuid.toLowerCase();
  const code = _codeRanges(text);
  return Array.from(text.matchAll(ITEM_LINK))
    .filter((match) => text[match.index - 1] !== "!" && !_inCode(match.index, code))
    .filter((match) => parseItemHref(match[2], origins)?.uuid === target)
    .map((match) => ({
      start: match.index,
      end: match.index + match[0].length,
      label: match[1],
      href: match[2],
    }));
};

export const retargetLinks = (
  text: string,
  links: ItemLink[],
  from: string,
  to: string,
): string =>
  [...links]
    .sort((a, b) => b.start - a.start)
    .reduce((result, link) => {
      const hrefAt = link.start + link.label.length + 2;
      const tail = result.slice(hrefAt, link.end).replace(new RegExp(from, "i"), to);
      return result.slice(0, hrefAt) + tail + result.slice(link.end);
    }, text);

const _unlinkOne = (text: string, link: ItemLink): string => {
  const lines = splitLines(text);
  const index = lineAt(lines, link.start);
  const start = lineStart(lines, index);
  const line = lines[index].text;
  const rest = line.slice(0, link.start - start) + line.slice(link.end - start);
  if (BARE_LINE.test(rest)) return joinLines(dropLine(lines, index));
  return text.slice(0, link.start) + link.label + text.slice(link.end);
};

export const unlinkItem = (text: string, uuid: string, origins: string[] = []): { text: string; removed: number } => {
  const links = itemLinksTo(text, uuid, origins).sort((a, b) => b.start - a.start);
  return {
    text: links.reduce(_unlinkOne, text),
    removed: links.length,
  };
};
