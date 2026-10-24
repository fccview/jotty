"use client";

import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import { CodeBlockRenderer } from "./CodeBlockRenderer";
import { ThemedCodeBlockRenderer } from "./ThemedCodeBlockRenderer";
import { useAppMode } from "@/app/_providers/AppModeProvider";

const TRAILING_NEWLINE = /\n$/;

export const CodeBlockNodeView = ({ node }: any) => {
  const { user } = useAppMode();
  const Renderer =
    user?.codeBlockStyle === "themed"
      ? ThemedCodeBlockRenderer
      : CodeBlockRenderer;

  return (
    <NodeViewWrapper>
      <Renderer
        language={node.attrs.language}
        code={node.textContent.replace(TRAILING_NEWLINE, "")}
      >
        <NodeViewContent<"code"> as="code" spellCheck={false} />
      </Renderer>
    </NodeViewWrapper>
  );
};
