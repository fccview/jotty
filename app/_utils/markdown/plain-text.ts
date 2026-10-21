type PlainRule = readonly [RegExp, string | ((match: string, ...groups: string[]) => string)];

const CODE_FENCE = /```[\s\S]*?```/g;
const HTML_TAG = /<[^>]+>/g;

export const CARD_PLAIN_RULES: readonly PlainRule[] = [
  [CODE_FENCE, " "],
  [/`[^`]+`/g, " "],
  [/!\[[^\]]*\]\([^)]+\)/g, " "],
  [/\[([^\]]+)\]\([^)]+\)/g, "$1"],
  [/<!--[\s\S]*?-->/g, " "],
  [HTML_TAG, " "],
  [/\|.+\|/g, " "],
  [/^#{1,6}\s+/gm, ""],
  [/[*_]{1,3}/g, ""],
  [/^>\s+/gm, ""],
  [/^[-*_]{3,}$/gm, " "],
  [/^[\s]*[-*+]\s+/gm, ""],
  [/^[\s]*\d+\.\s+/gm, ""],
  [/^[\s]*-?\s*\[[ xX]\]\s+/gm, ""],
  [/\[\s*\]\([^)]+\)/g, " "],
];

export const EXCERPT_PLAIN_RULES: readonly PlainRule[] = [
  [CODE_FENCE, " "],
  [HTML_TAG, " "],
  [/!?\[([^\]]*)\]\([^)]*\)/g, "$1"],
  [/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, alias) => alias || target],
  [/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, ""],
  [/[*_`~]/g, ""],
  [/\s+/g, " "],
];

export const stripMarkdown = (content: string, rules: readonly PlainRule[]): string =>
  rules.reduce(
    (text, [pattern, replacement]) =>
      typeof replacement === "string"
        ? text.replace(pattern, replacement)
        : text.replace(pattern, replacement),
    content,
  );
