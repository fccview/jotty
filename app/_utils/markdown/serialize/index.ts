import { serializeInline } from "./inline";
import { TEXT_BLOCKS } from "./text-blocks";
import { LIST_BLOCKS, blockContexts } from "./lists";
import { CODE_BLOCKS } from "./code";
import { MEDIA_BLOCKS } from "./media";
import { TABLE_BLOCKS } from "./tables";
import {
  NodeName,
  type BlockContext,
  type BlockWriter,
  type NodeJson,
  type SerializeOptions,
  type Serializer,
} from "./types";

const WRITERS: Record<string, BlockWriter> = {
  ...TEXT_BLOCKS,
  ...LIST_BLOCKS,
  ...CODE_BLOCKS,
  ...MEDIA_BLOCKS,
  ...TABLE_BLOCKS,
};

const isEmptyParagraph = (node: NodeJson) =>
  node.type === NodeName.Paragraph && !(node.content?.length);

const serializer: Serializer = {
  block: (node, context) => {
    const writer = WRITERS[node.type];
    if (!writer) {
      console.error(`[markdown] no writer for node type "${node.type}"`);
      return "";
    }
    return writer(node, context, serializer);
  },
  blocks: (nodes, context) => {
    if (!nodes?.length) return "";
    const contexts = blockContexts(nodes, context);
    return nodes.map((node, index) => serializer.block(node, contexts[index])).join("\n\n");
  },
  inline: (nodes, context) => serializeInline(nodes, context),
};

export const trimTrailingEmpty = (nodes: NodeJson[]) => {
  let end = nodes.length;
  while (end > 0 && isEmptyParagraph(nodes[end - 1])) end--;
  return nodes.slice(0, end);
};

export const serializeBlock = (node: NodeJson, context: BlockContext) =>
  serializer.block(node, context);

export const serializeDoc = (doc: NodeJson, options: SerializeOptions = {}) =>
  serializer.blocks(trimTrailingEmpty(doc.content || []), { options });

export type { NodeJson, SerializeOptions };
