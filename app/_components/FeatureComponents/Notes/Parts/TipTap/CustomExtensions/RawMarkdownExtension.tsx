"use client";

import type { NodeConfig } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, ReactNodeViewProps } from "@tiptap/react";
import { useTranslations } from "next-intl";

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

export const RAW_BLOCK_VIEW: Partial<NodeConfig> = {
  addNodeView() {
    return ReactNodeViewRenderer(RawBlockView, { stopEvent: () => true });
  },
};

export const RAW_INLINE_VIEW: Partial<NodeConfig> = {
  addNodeView() {
    return ReactNodeViewRenderer(RawInlineView);
  },
};
