import { splitMarkdown } from "./segments";
import { markdownToEditorHtml } from "./parse/to-html";
import { rawBlockHtml } from "./parse/raw";
import { serializeBlock, trimTrailingEmpty } from "./serialize";
import { clashes, freshMarker, preservedStyle } from "./markers";
import { isLegacyHtml } from "./legacy";
import { keyOf, planPieces, trailingEmptyKeys, type MarkdownSnapshot, type SnapshotSegment } from "./plan";
import { NodeName, type BlockContext, type NodeJson, type SerializeOptions } from "./serialize/types";

export { keyOf };
export type { MarkdownSnapshot };

export type HtmlToNodes = (html: string) => NodeJson[];

export interface Block {
  json: NodeJson;
  key: string;
}

const PARSE_CACHE_LIMIT = 4000;
const parseCaches = new WeakMap<HtmlToNodes, Map<string, NodeJson[]>>();

const parseSegment = (src: string, definitions: string, toNodes: HtmlToNodes) => {
  const cache = parseCaches.get(toNodes) ?? new Map<string, NodeJson[]>();
  parseCaches.set(toNodes, cache);
  const cacheKey = `${definitions}\u0000${src}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  let nodes = toNodes(markdownToEditorHtml(src, definitions));
  if (nodes.length === 0) nodes = toNodes(rawBlockHtml(src));
  if (cache.size >= PARSE_CACHE_LIMIT) cache.clear();
  cache.set(cacheKey, nodes);
  return nodes;
};

export interface LoadedMarkdown {
  doc: NodeJson;
  snapshot: MarkdownSnapshot;
}

export const normalizeLineEndings = (text: string) => text.replace(/\r\n?/g, "\n");

const docOf = (content: NodeJson[]): NodeJson => ({
  type: NodeName.Doc,
  content: content.length ? content : [{ type: NodeName.Paragraph }],
});

export const loadMarkdown = (markdown: string, toNodes: HtmlToNodes): LoadedMarkdown => {
  const source = normalizeLineEndings(markdown || "");
  if (isLegacyHtml(source)) {
    return {
      doc: docOf(toNodes(source)),
      snapshot: { source, head: "", tail: "", segments: [], legacyHtml: true },
    };
  }
  const { segments, head, tail, definitions } = splitMarkdown(source);
  const content: NodeJson[] = [];
  const snapshotSegments: SnapshotSegment[] = segments.map((segment) => {
    const context = segment.kind === "definition" || segment.kind === "footnoteDefinition" ? "" : definitions;
    const nodes = parseSegment(segment.src, context, toNodes);
    content.push(...nodes);
    return { src: segment.src, gap: segment.gap, keys: nodes.map(keyOf) };
  });
  return {
    doc: docOf(content),
    snapshot: { source, head, tail, segments: snapshotSegments },
  };
};

interface Piece {
  text: string;
  segment?: number;
  node: NodeJson;
  context?: BlockContext;
}

export const saveMarkdown = (
  doc: NodeJson,
  snapshot: MarkdownSnapshot | null,
  options: SerializeOptions = {},
): string =>
  saveBlocks((doc.content || []).map((json) => ({ json, key: keyOf(json) })), snapshot, options);

export const saveBlocks = (
  blocks: Block[],
  snapshot: MarkdownSnapshot | null,
  options: SerializeOptions = {},
): string => {
  const kept = Math.min(
    blocks.length,
    trimTrailingEmpty(blocks.map((block) => block.json)).length + trailingEmptyKeys(snapshot),
  );
  const children = blocks.slice(0, kept).map((block) => block.json);
  const keys = blocks.slice(0, kept).map((block) => block.key);
  const segments = snapshot?.segments ?? [];
  const plan = planPieces(keys, segments);
  const pieces: Piece[] = [];

  plan.forEach((step, position) => {
    const node = children[step.index];
    const previous = pieces[pieces.length - 1];
    if (step.segment !== undefined) {
      const src = segments[step.segment].src;
      const piece = { text: src, segment: step.segment, node, context: { options, ...preservedStyle(node, src) } };
      if (step.span > 1 || !clashes(previous, piece)) {
        pieces.push(piece);
        return;
      }
    }
    const next = plan[position + 1];
    const following = next?.segment !== undefined
      ? { node: children[next.index], context: { options, ...preservedStyle(children[next.index], segments[next.segment].src) } }
      : undefined;
    const context = { options, ...freshMarker(node, previous, following) };
    pieces.push({ text: serializeBlock(node, context), node, context });
  });

  if (pieces.length === 0) return segments.length === 0 && snapshot && !snapshot.legacyHtml ? snapshot.source : "";

  const body = pieces
    .map((piece, index) => {
      if (index === 0) return piece.text;
      const previous = pieces[index - 1];
      const adjacent =
        piece.segment !== undefined &&
        previous.segment !== undefined &&
        piece.segment === previous.segment + 1;
      return `${adjacent ? segments[piece.segment!].gap : "\n\n"}${piece.text}`;
    })
    .join("");

  return `${snapshot?.head ?? ""}${body}${snapshot?.tail ?? ""}`;
};
