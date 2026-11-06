import { defangHtml } from "@/app/_utils/markdown-utils";
import { closesEmphasis, emphasisOf, extractHashtagsFromContent, TAG_LEAD } from "@/app/_utils/tag-utils";
import { dropLine, joinLines, splitLines } from "@/app/_utils/text-lines";

export const FIND_MISSING = "The find text is not in the note";
export const FIND_AMBIGUOUS = "The find text matches more than once. Include more of the text around it";
export const TAG_INVALID = "Tags start with a letter and use letters, digits, _, - or /";

const CRLF = "\r\n";
const TAG_NAME = /^[a-zA-Z][a-zA-Z0-9_/-]*$/;
const FENCE = /^\s*(```|~~~)/;
const INLINE_CODE = /(`[^`]*`)/;
const TAG_ONLY_LINE = /^\s*(?:#[a-zA-Z][a-zA-Z0-9_/-]*\s*)+$/;
const OPENS_DESTINATION = /(?:^ {0,3}\[[^\]^\n][^\]\n]*\]:|\]\()[ \t]{0,3}$/;
const LEADING_ANCHOR = /^[ \t]{0,3}#[^\s)]*/;
const UNDERSCORE = "_";
const WORD_CHAR = /[a-zA-Z0-9]/;

export type TextEdit = { body: string } | { error: string };

const _eolOf = (body: string): string => (body.includes(CRLF) ? CRLF : "\n");

const _asEol = (text: string, eol: string): string =>
  eol === CRLF ? text.replace(/\r?\n/g, CRLF) : text;

const _count = (haystack: string, needle: string): number =>
  haystack.split(needle).length - 1;

const _endsLine = (body: string, needle: string, eol: string): boolean =>
  needle.endsWith(eol) && !body.endsWith(eol);

export const findReplace = (body: string, find: string, replace: string): TextEdit => {
  const eol = _eolOf(body);
  const needle = _asEol(find, eol);
  const haystack = _count(body, needle) === 0 && _endsLine(body, needle, eol) ? body + eol : body;
  const matches = _count(haystack, needle);
  if (matches === 0) return { error: FIND_MISSING };
  if (matches > 1) return { error: FIND_AMBIGUOUS };
  const at = haystack.indexOf(needle);
  const swapped = defangHtml(_asEol(replace, eol));
  return { body: haystack.slice(0, at) + swapped + haystack.slice(at + needle.length) };
};

export const cleanTag = (tag: string): string | null => {
  const name = tag.trim().replace(/^#/, "");
  return TAG_NAME.test(name) ? name.toLowerCase() : null;
};

const _tagPattern = (tag: string): RegExp =>
  new RegExp(`${TAG_LEAD}#${tag.replace(/[/-]/g, "\\$&")}(?![a-zA-Z0-9/-])([*_~]{0,3})([ \\t]?)`, "gi");

const _mirrored = (marks: string, close: string): number => {
  let count = 0;
  while (count < close.length && close[count] === marks[marks.length - 1 - count]) count++;
  return count;
};

const _dropTag = (match: string, lead: string, close: string, gap: string, at: number, text: string): string => {
  const marks = emphasisOf(lead);
  const paired = _mirrored(marks, close);
  const opened = lead.slice(0, lead.length - paired);
  const rest = close.slice(paired);
  const glued = !gap && WORD_CHAR.test(text[at + match.length] ?? "");
  if (rest.startsWith(UNDERSCORE) || (close.endsWith(UNDERSCORE) && glued)) return match;
  if (marks && !paired && !closesEmphasis(text, at + lead.length + 1, marks)) return match;
  if (emphasisOf(opened) && !rest) return opened;
  return rest ? opened + rest + gap : opened;
};

const _stripTags = (text: string, tags: string[]): string =>
  text
    .split(INLINE_CODE)
    .map((part, index) =>
      index % 2 ? part : tags.reduce((result, tag) => result.replace(_tagPattern(tag), _dropTag), part),
    )
    .join("");

const _stripInContext = (text: string, above: string | undefined, tags: string[]): string => {
  const anchor = above !== undefined && OPENS_DESTINATION.test(above) ? text.match(LEADING_ANCHOR)?.[0] : "";
  return anchor ? anchor + _stripTags(text.slice(anchor.length), tags) : _stripTags(text, tags);
};

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
  const source = splitLines(body);
  const lines = source.map((line, index) => {
    const opener = line.text.match(FENCE)?.[1];
    if (fence) {
      if (opener === fence) fence = null;
      return line;
    }
    if (opener) {
      fence = opener;
      return line;
    }
    const stripped = _stripInContext(line.text, source[index - 1]?.text, tags);
    if (stripped === line.text) return line;
    if (!stripped.trim()) emptied.push(index);
    return { ...line, text: stripped.replace(/[ \t]+$/, "") };
  });
  return joinLines(emptied.reverse().reduce(dropLine, lines));
};
