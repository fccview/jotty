import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { Root, RootContent } from "mdast";

export interface Segment {
  src: string;
  gap: string;
  kind: RootContent["type"];
}

export interface SplitMarkdown {
  segments: Segment[];
  head: string;
  tail: string;
  definitions: string;
}

const PAIRED_HTML = ["details", "table"];

const blockParser = unified().use(remarkParse).use(remarkGfm);

export const parseBlocks = (markdown: string): Root =>
  blockParser.parse(markdown) as Root;

const tagBalance = (html: string, tag: string) => {
  const opens = html.match(new RegExp(`<${tag}(\\s|>|$)`, "gi"))?.length ?? 0;
  const closes = html.match(new RegExp(`</${tag}\\s*>`, "gi"))?.length ?? 0;
  return opens - closes;
};

const openPairs = (html: string) =>
  PAIRED_HTML.reduce((sum, tag) => sum + Math.max(tagBalance(html, tag), 0), 0);

const closedPairs = (html: string) =>
  PAIRED_HTML.reduce((sum, tag) => sum + Math.max(-tagBalance(html, tag), 0), 0);

const offsets = (node: RootContent) => ({
  start: node.position?.start.offset ?? 0,
  end: node.position?.end.offset ?? 0,
});

export const splitMarkdown = (markdown: string): SplitMarkdown => {
  const tree = parseBlocks(markdown);
  const nodes = tree.children;
  const segments: Segment[] = [];
  const definitions: string[] = [];
  let cursor = 0;
  let head = "";

  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index];
    let { start, end } = offsets(node);

    if (node.type === "html") {
      let depth = openPairs(node.value);
      while (depth > 0 && index + 1 < nodes.length) {
        const next = nodes[++index];
        end = offsets(next).end;
        if (next.type === "html") {
          depth += openPairs(next.value) - closedPairs(next.value);
        }
      }
    }

    const gap = markdown.slice(cursor, start);
    if (segments.length === 0) head = gap;
    const src = markdown.slice(start, end);
    if (node.type === "definition" || node.type === "footnoteDefinition") definitions.push(src);
    segments.push({ src, gap: segments.length === 0 ? "" : gap, kind: node.type });
    cursor = end;
  }

  return {
    segments,
    head,
    tail: markdown.slice(cursor),
    definitions: definitions.join("\n"),
  };
};
