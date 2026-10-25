import { Node, mergeAttributes } from "@tiptap/core";
import { RawAttr, RawNode } from "@/app/_utils/markdown/consts";

const sourceAttribute = {
  source: {
    default: "",
    parseHTML: (element: HTMLElement) => element.getAttribute(RawAttr.Source) ?? "",
    renderHTML: (attributes: Record<string, string>) => ({ [RawAttr.Source]: attributes.source }),
  },
};

export const RawBlockNode = Node.create({
  name: RawNode.Block,
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes: () => sourceAttribute,

  parseHTML: () => [{ tag: `div[${RawAttr.Block}]`, priority: 100 }],

  renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes({ [RawAttr.Block]: "" }, HTMLAttributes)],
});

export const RawInlineNode = Node.create({
  name: RawNode.Inline,
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes: () => sourceAttribute,

  parseHTML: () => [{ tag: `span[${RawAttr.Inline}]`, priority: 100 }],

  renderHTML: ({ HTMLAttributes }) => ["span", mergeAttributes({ [RawAttr.Inline]: "" }, HTMLAttributes)],
});
