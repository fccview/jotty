"use client";

import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import { CodeBlockRenderer } from "./CodeBlockRenderer";
import { ThemedCodeBlockRenderer } from "./ThemedCodeBlockRenderer";
import { useAppMode } from "@/app/_providers/AppModeProvider";

export const CodeBlockNodeView = ({ node }: any) => {
  const { user } = useAppMode();
  const Renderer =
    user?.codeBlockStyle === "themed"
      ? ThemedCodeBlockRenderer
      : CodeBlockRenderer;

  return (
    <NodeViewWrapper>
      <Renderer language={node.attrs.language} code={node.textContent}>
        {/* @ts-ignore */}
        <NodeViewContent as="code" />
      </Renderer>
    </NodeViewWrapper>
  );
};
