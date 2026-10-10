"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, ReactNodeViewProps } from "@tiptap/react";
import { useTranslations } from "next-intl";
import { RawAttr, RawNode } from "@/app/_utils/markdown/consts";

const sourceAttribute = {
  source: {
    default: "",
    parseHTML: (element: HTMLElement) => element.getAttribute(RawAttr.Source) ?? "",
    renderHTML: (attributes: Record<string, string>) => ({ [RawAttr.Source]: attributes.source }),
  },
};

const RawBlockView = ({ node, updateAttributes, editor }: ReactNodeViewProps) => {
  const t = useTranslations();
  const source = String(node.attrs.source ?? "");
  return (
    <NodeViewWrapper className="raw-markdown-block my-4" data-raw-block="">
      <div className="text-xs text-muted-foreground mb-1 select-none" contentEditable={false}>
        {t("editor.rawMarkdown")}
      </div>
      <textarea
        className="w-full font-mono text-sm bg-muted/50 border border-border rounded-jotty p-2 resize-y focus:outline-none"
        value={source}
        rows={Math.min(Math.max(source.split("\n").length, 1), 20)}
        readOnly={!editor.isEditable}
        spellCheck={false}
        onChange={(event) => updateAttributes({ source: event.target.value })}
      />
    </NodeViewWrapper>
  );
};

const RawInlineView = ({ node }: ReactNodeViewProps) => (
  <NodeViewWrapper as="span" className="raw-markdown-inline" data-raw-inline="">
    <code className="text-muted-foreground">{String(node.attrs.source ?? "")}</code>
  </NodeViewWrapper>
);

export const RawBlockExtension = Node.create({
  name: RawNode.Block,
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes: () => sourceAttribute,

  parseHTML: () => [{ tag: `div[${RawAttr.Block}]`, priority: 100 }],

  renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes({ [RawAttr.Block]: "" }, HTMLAttributes)],

  addNodeView() {
    return ReactNodeViewRenderer(RawBlockView, { stopEvent: () => true });
  },
});

export const RawInlineExtension = Node.create({
  name: RawNode.Inline,
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes: () => sourceAttribute,

  parseHTML: () => [{ tag: `span[${RawAttr.Inline}]`, priority: 100 }],

  renderHTML: ({ HTMLAttributes }) => ["span", mergeAttributes({ [RawAttr.Inline]: "" }, HTMLAttributes)],

  addNodeView() {
    return ReactNodeViewRenderer(RawInlineView);
  },
});
