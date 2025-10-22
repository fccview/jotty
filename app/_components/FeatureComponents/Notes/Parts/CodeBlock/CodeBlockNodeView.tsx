"use client";

import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import { CodeBlockRenderer } from "./CodeBlockRenderer";

export const CodeBlockNodeView = ({ node }: any) => {
  return (
    <NodeViewWrapper>
      <CodeBlockRenderer language={node.attrs.language} code={node.textContent}>
        {/* @ts-ignore */}
        <NodeViewContent as="code" />
      </CodeBlockRenderer>
    </NodeViewWrapper>
  );
};
