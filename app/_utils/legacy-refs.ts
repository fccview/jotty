import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";
import type { Nodes, Root } from "mdast";
import { AttachmentKinds } from "@/app/_consts/attachments";

interface Spot {
  start: number;
  end: number;
  suffix: string;
  url: string;
}

export interface LegacyRef extends Spot {
  kind: AttachmentKinds;
  owner: string;
  name: string;
}

export interface AttachmentRef extends Spot {
  item: string;
  name: string;
}

interface Scan<T> {
  refs: T[];
  foreign: string[];
  loose: string[];
}

export type LegacyScan = Scan<LegacyRef>;

type Span = [number, number];

const LEGACY_URL =
  /((?:https?:)?\/\/[^\s/"'<>()[\]]+)?\/api\/(image|video|file)\/([^\s/"'<>()[\]?#]+)\/([^\s/"'<>()[\]?#]+)((?:[?#][^\s"'<>()[\]]*)?)/g;
const ATTACHMENT_URL =
  /((?:https?:)?\/\/[^\s/"'<>()[\]]+)?\/api\/attachment\/([0-9a-fA-F-]{36})\/([^\s/"'<>()[\]?#]+)((?:[?#][^\s"'<>()[\]]*)?)/g;
const HTML_ATTR = /\b(?:src|href|poster|data-src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi;
const MARKDOWN_ESCAPE = /\\([!-/:-@[-`{-~])/g;

const KINDS: Record<string, AttachmentKinds> = {
  image: AttachmentKinds.IMAGE,
  video: AttachmentKinds.VIDEO,
  file: AttachmentKinds.FILE,
};

const processor = unified().use(remarkParse).use(remarkGfm);

const _decode = (segment: string): string | null => {
  try {
    return decodeURIComponent(segment.replace(MARKDOWN_ESCAPE, "$1"));
  } catch {
    return null;
  }
};

const _spanOf = (node: Nodes): Span | null => {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  return start === undefined || end === undefined ? null : [start, end];
};

const _attributeSpans = (body: string, [start, end]: Span): Span[] => {
  const spans: Span[] = [];
  const html = body.slice(start, end);

  for (const match of Array.from(html.matchAll(HTML_ATTR))) {
    const value = match[1] ?? match[2] ?? match[3] ?? "";
    const at = start + match.index + match[0].length - value.length - (match[3] === undefined ? 1 : 0);
    spans.push([at, at + value.length]);
  }

  return spans;
};

const _hostOf = (origin: string): string | null => {
  try {
    return new URL(origin.startsWith("//") ? `http:${origin}` : origin).host;
  } catch {
    return null;
  }
};

const _within = (spans: Span[], start: number, end: number): boolean =>
  spans.some(([from, to]) => start >= from && end <= to);

const _touches = (spans: Span[], start: number, end: number): boolean =>
  spans.some(([from, to]) => start < to && end > from);

const _sift = <T>(
  body: string,
  origins: string[],
  pattern: RegExp,
  toRef: (match: RegExpExecArray, start: number, end: number) => T | null,
): Scan<T> | null => {
  const scan: Scan<T> = { refs: [], foreign: [], loose: [] };
  if (!body.includes("/api/")) return scan;

  let tree: Root;
  try {
    tree = processor.parse(body) as Root;
  } catch (error) {
    console.error("Could not parse a body for attachment URLs:", error);
    return null;
  }

  const allowed: Span[] = [];
  const code: Span[] = [];

  visit(tree, (node) => {
    const span = _spanOf(node);
    if (!span) return;
    if (node.type === "code" || node.type === "inlineCode") code.push(span);
    else if (node.type === "link" || node.type === "image" || node.type === "definition") allowed.push(span);
    else if (node.type === "html") allowed.push(..._attributeSpans(body, span));
  });

  const hosts = origins.map(_hostOf).filter((host): host is string => Boolean(host));

  for (const match of Array.from(body.matchAll(pattern)) as RegExpExecArray[]) {
    const start = match.index;
    const end = start + match[0].length;
    if (_touches(code, start, end)) continue;

    if (!_within(allowed, start, end)) {
      scan.loose.push(match[0]);
      continue;
    }

    const origin = match[1];
    if (origin && !hosts.includes(_hostOf(origin) || "")) {
      scan.foreign.push(match[0]);
      continue;
    }

    const ref = toRef(match, start, end);
    if (ref) scan.refs.push(ref);
    else scan.loose.push(match[0]);
  }

  return scan;
};

export const scanLegacy = (body: string, origins: string[]): LegacyScan | null =>
  _sift(body, origins, LEGACY_URL, (match, start, end) => {
    const owner = _decode(match[3]);
    const name = _decode(match[4]);
    if (!owner || !name) return null;
    return { start, end, kind: KINDS[match[2]], owner, name, suffix: match[5] || "", url: match[0] };
  });

export const scanAttachments = (body: string, origins: string[]): AttachmentRef[] => {
  if (!body.includes("/api/attachment/")) return [];
  const scan = _sift(body, origins, ATTACHMENT_URL, (match, start, end) => {
    const name = _decode(match[3]);
    if (!name) return null;
    return { start, end, item: match[2].toLowerCase(), name, suffix: match[4] || "", url: match[0] };
  });
  return scan?.refs ?? [];
};

export const swapRefs = (body: string, swaps: { ref: Spot; url: string }[]): string =>
  swaps
    .slice()
    .sort((a, b) => b.ref.start - a.ref.start)
    .reduce(
      (text, { ref, url }) => `${text.slice(0, ref.start)}${url}${ref.suffix}${text.slice(ref.end)}`,
      body,
    );
