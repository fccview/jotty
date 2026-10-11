import { getContrastColor } from "@/app/_utils/color-utils";
import { escapeHtmlAttr } from "./escape";
import { MarkName, type MarkJson, type NodeJson } from "./types";

interface Delimiters {
  open: string;
  close: string;
}

export const MARKDOWN_MARKS = new Set<string>([MarkName.Bold, MarkName.Italic, MarkName.Strike]);
export const STAR_MARKS = new Set<string>([MarkName.Bold, MarkName.Italic]);

const tag = (name: string, attrs = "") => ({ open: `<${name}${attrs}>`, close: `</${name}>` });

const styleOf = (value: unknown) => (value ? String(value).trim() : "");

const linkDestination = (href: string) =>
  /[\s()<>]/.test(href) ? `<${href.replace(/>/g, "%3E")}>` : href;

const linkTitle = (title: unknown) =>
  title ? ` "${String(title).replace(/"/g, '\\"')}"` : "";

export const delimiters = (mark: MarkJson): Delimiters | null => {
  const attrs = mark.attrs || {};
  switch (mark.type) {
    case MarkName.Bold:
      return { open: "**", close: "**" };
    case MarkName.Italic:
      return { open: "*", close: "*" };
    case MarkName.Strike:
      return { open: "~~", close: "~~" };
    case MarkName.Underline:
      return tag("u");
    case MarkName.Kbd:
      return tag("kbd");
    case MarkName.Subscript:
      return tag("sub");
    case MarkName.Superscript:
      return tag("sup");
    case MarkName.Abbreviation:
      return tag("abbr", attrs.title ? ` title="${escapeHtmlAttr(attrs.title)}"` : "");
    case MarkName.Mark:
      return tag("mark", attrs.style ? ` style="${escapeHtmlAttr(styleOf(attrs.style))}"` : "");
    case MarkName.Highlight:
      return attrs.color
        ? tag("mark", ` style="background-color: ${attrs.color}; color: ${getContrastColor(attrs.color)}"`)
        : tag("mark");
    case MarkName.TextStyle:
      return attrs.color ? tag("span", ` style="color: ${attrs.color}"`) : null;
    case MarkName.FontFamily: {
      const font = styleOf(attrs.style).replace(/^font-family:\s*/i, "").replace(/;$/, "").replace(/"/g, "'");
      return font ? tag("span", ` style="font-family: ${font}"`) : null;
    }
    case MarkName.Link:
      return { open: "[", close: `](${linkDestination(String(attrs.href || ""))}${linkTitle(attrs.title)})` };
    default:
      return null;
  }
};

export const sameMark = (a: MarkJson, b: MarkJson) =>
  a.type === b.type && JSON.stringify(a.attrs || {}) === JSON.stringify(b.attrs || {});

export const isCode = (node: NodeJson) => node.marks?.some((mark) => mark.type === MarkName.Code) ?? false;

export const delimitedMarks = (node: NodeJson) =>
  (node.marks || []).filter((mark) => mark.type !== MarkName.Code && delimiters(mark));

export const keptCount = (active: MarkJson[], marks: MarkJson[]) => {
  let keep = 0;
  while (keep < active.length && marks.some((mark) => sameMark(mark, active[keep]))) keep++;
  return keep;
};
