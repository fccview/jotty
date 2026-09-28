import { defangHtml } from "@/app/_utils/markdown-utils";
import { extractHashtagsFromContent } from "@/app/_utils/tag-utils";
import { dropLine, joinLines, splitLines } from "@/app/_utils/text-lines";

export const FIND_MISSING = "The find text is not in the note";
export const FIND_AMBIGUOUS = "The find text matches more than once. Include more of the text around it";
export const TAG_INVALID = "Tags start with a letter and use letters, digits, _, - or /";

const CRLF = "\r\n";
const TAG_NAME = /^[a-zA-Z][a-zA-Z0-9_/-]*$/;
const FENCE = /^\s*(```|~~~)/;
const INLINE_CODE = /(`[^`]*`)/;
const TAG_ONLY_LINE = /^\s*(?:#[a-zA-Z][a-zA-Z0-9_/-]*\s*)+$/;

export type TextEdit = { body: string } | { error: string };

const _eolOf = (body: string): string => (body.includes(CRLF) ? CRLF : "\n");

const _asEol = (text: string, eol: string): string =>
  eol === CRLF ? text.replace(/\r?\n/g, CRLF) : text;

const _count = (haystack: string, needle: string): number =>
  haystack.split(needle).length - 1;

export const findReplace = (body: string, find: string, replace: string): TextEdit => {
  const eol = _eolOf(body);
  const needle = _asEol(find, eol);
  const matches = _count(body, needle);
  if (matches === 0) return { error: FIND_MISSING };
  if (matches > 1) return { error: FIND_AMBIGUOUS };
  const at = body.indexOf(needle);
  const swapped = defangHtml(_asEol(replace, eol));
  return { body: body.slice(0, at) + swapped + body.slice(at + needle.length) };
};

export const cleanTag = (tag: string): string | null => {
  const name = tag.trim().replace(/^#/, "");
  return TAG_NAME.test(name) ? name.toLowerCase() : null;
};

const _tagPattern = (tag: string): RegExp =>
  new RegExp(`(^|[\\s(])#${tag.replace(/[/-]/g, "\\$&")}(?![a-zA-Z0-9_/-])[ \\t]?`, "gi");

const _stripTags = (text: string, tags: string[]): string =>
  text
    .split(INLINE_CODE)
    .map((part, index) =>
      index % 2 ? part : tags.reduce((result, tag) => result.replace(_tagPattern(tag), "$1"), part),
    )
    .join("");

export const addHashtags = (body: string, tags: string[]): string => {
  const present = new Set(extractHashtagsFromContent(body));
  const fresh = tags.filter((tag) => !present.has(tag));
  if (!fresh.length) return body;

  const eol = _eolOf(body);
  const line = fresh.map((tag) => `#${tag}`).join(" ");
  const trimmed = body.replace(/\s+$/, "");
  const tail = body.slice(trimmed.length);
  const lastLine = trimmed.split(/\r?\n/).pop() ?? "";

  if (!trimmed) return `${line}${eol}`;
  if (TAG_ONLY_LINE.test(lastLine)) return `${trimmed} ${line}${tail}`;
  return `${trimmed}${eol}${eol}${line}${tail}`;
};

export const dropHashtags = (body: string, tags: string[]): string => {
  let fence: string | null = null;
  const emptied: number[] = [];
  const lines = splitLines(body).map((line, index) => {
    const opener = line.text.match(FENCE)?.[1];
    if (fence) {
      if (opener === fence) fence = null;
      return line;
    }
    if (opener) {
      fence = opener;
      return line;
    }
    const stripped = _stripTags(line.text, tags);
    if (stripped === line.text) return line;
    if (!stripped.trim()) emptied.push(index);
    return { ...line, text: stripped.replace(/[ \t]+$/, "") };
  });
  return joinLines(emptied.reverse().reduce(dropLine, lines));
};
