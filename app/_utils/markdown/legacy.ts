import { splitMarkdown } from "./segments";

const LEGACY_HTML_START = /^<(?:(?:p|h[1-6]|blockquote)>|(?:ul|ol|pre)[\s>])/i;
const HTML_SEGMENT = "html";

const PRE_BLOCK = /<pre\b[\s\S]*?<\/pre>/gi;
const BLANK_LINE = /\n[ \t]*\n/;

export const isLegacyHtml = (source: string) => {
  const flat = source.trim().replace(PRE_BLOCK, "<pre></pre>");
  if (!LEGACY_HTML_START.test(flat) || BLANK_LINE.test(flat)) return false;
  return splitMarkdown(flat).segments.every((segment) => segment.kind === HTML_SEGMENT);
};
