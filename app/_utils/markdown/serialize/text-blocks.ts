import { EMPTY_PARAGRAPH } from "@/app/_utils/markdown/consts";
import { indent, NodeName, type BlockWriter } from "./types";

const isEmpty = (content: unknown[] | undefined) => !content || content.length === 0;

export const paragraph: BlockWriter = (node, context, serializer) => {
  if (isEmpty(node.content)) return context.soleChild || context.inTable ? "" : EMPTY_PARAGRAPH;
  return serializer.inline(node.content, context);
};

export const heading: BlockWriter = (node, context, serializer) => {
  const level = Math.min(Math.max(Number(node.attrs?.level) || 1, 1), 6);
  const text = serializer.inline(node.content, { ...context, inHeading: true }).replace(/(\s)(#+)\s*$/, "$1\\$2");
  return `${"#".repeat(level)}${text ? ` ${text}` : ""}`;
};

export const horizontalRule: BlockWriter = () => "---";

export const blockquote: BlockWriter = (node, context, serializer) =>
  indent(serializer.blocks(node.content, { ...context, soleChild: false }), "> ");

export const callout: BlockWriter = (node, context, serializer) => {
  const type = String(node.attrs?.type || "info").toUpperCase();
  const body = serializer.blocks(node.content, { ...context, soleChild: false });
  return indent(`[!${type}]${body ? `\n${body}` : ""}`, "> ");
};

export const details: BlockWriter = (node, context, serializer) => {
  const summary = String(node.attrs?.summary ?? "Details");
  const body = serializer.blocks(node.content, { ...context, soleChild: false });
  return `<details>\n<summary>${summary}</summary>\n\n${body}\n\n</details>`;
};

export const rawBlock: BlockWriter = (node) => String(node.attrs?.source ?? "");

export const TEXT_BLOCKS = {
  [NodeName.Paragraph]: paragraph,
  [NodeName.Heading]: heading,
  [NodeName.HorizontalRule]: horizontalRule,
  [NodeName.Blockquote]: blockquote,
  [NodeName.Callout]: callout,
  [NodeName.Details]: details,
  [NodeName.RawBlock]: rawBlock,
};
