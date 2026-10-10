import { Extension } from "@tiptap/core";
import { Fragment, Slice, type Node as PmNode, type ResolvedPos, type Schema } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { loadMarkdown } from "@/app/_utils/markdown/session";
import { htmlToNodes } from "@/app/_utils/markdown/editor-bridge";

const BLOCK_SYNTAX = /^\s{0,3}(#{1,6}\s|[-*+]\s|\d{1,9}[.)]\s|>|```|~~~|\|.*\|)/m;
const INLINE_SYNTAX = /\*\*[^*\n]+\*\*|__[^_\n]+__|~~[^~\n]+~~|`[^`\n]+`|!?\[[^\]\n]*\]\([^)\n]+\)/;
const LINE_BREAK = /\r\n?|\n/;
const CODE_MARK = "code";
const DEFAULT_PARSING = null as unknown as Slice;

export const looksLikeMarkdown = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return LINE_BREAK.test(trimmed) || BLOCK_SYNTAX.test(trimmed) || INLINE_SYNTAX.test(trimmed);
};

const LEADING_SPACE = /^[ \t]*/;
const TRAILING_SPACE = /[ \t]*$/;

const keepEdgeSpace = (text: string, node: PmNode) => {
  const lead = LEADING_SPACE.exec(text)?.[0];
  const trail = TRAILING_SPACE.exec(text)?.[0];
  const schema = node.type.schema;
  const pieces = [lead && schema.text(lead), ...node.content.content, trail && schema.text(trail)].filter(
    (piece): piece is PmNode => Boolean(piece),
  );
  return node.copy(Fragment.from(pieces));
};

export const markdownSlice = (text: string, schema: Schema) => {
  const { doc } = loadMarkdown(text, htmlToNodes(schema));
  const nodes = (doc.content ?? []).map((json) => schema.nodeFromJSON(json));
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (nodes.length === 1 && first.type === schema.nodes.paragraph) {
    return new Slice(Fragment.from(keepEdgeSpace(text, first)), 1, 1);
  }
  const openStart = first?.type === schema.nodes.paragraph ? 1 : 0;
  const openEnd = last?.type === schema.nodes.paragraph ? 1 : 0;
  return new Slice(Fragment.from(nodes), openStart, openEnd);
};

const insideCode = ($context: ResolvedPos) =>
  Boolean($context.parent.type.spec.code) || $context.marks().some((mark) => mark.type.name === CODE_MARK);

export const markdownPasteKey = new PluginKey("markdownPaste");

export const MarkdownPaste = Extension.create({
  name: "markdownPaste",

  addProseMirrorPlugins() {
    let parsed: Slice | null = null;
    return [
      new Plugin({
        key: markdownPasteKey,
        props: {
          clipboardTextParser: (text, $context, plain, view) => {
            parsed = null;
            if (plain || insideCode($context) || !looksLikeMarkdown(text)) return DEFAULT_PARSING;
            try {
              parsed = markdownSlice(text, view.state.schema);
            } catch (error) {
              console.error("Markdown paste fell back to plain text", error);
            }
            return parsed ?? DEFAULT_PARSING;
          },
          transformPasted: (slice) => {
            const ours = parsed;
            parsed = null;
            return ours ?? slice;
          },
        },
      }),
    ];
  },
});
