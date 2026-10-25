import type { NodeConfig } from "@tiptap/core";
import {
  NodeViewWrapper,
  NodeViewContent,
  ReactNodeViewRenderer,
  ReactNodeViewProps,
} from "@tiptap/react";
import { FC } from "react";

const DetailsNodeView: FC<ReactNodeViewProps<HTMLElement>> = ({ node }) => {
  return (
    <NodeViewWrapper as="details">
      <summary className="font-semibold cursor-pointer select-none">
        {node.attrs.summary}
      </summary>
      <NodeViewContent as="div" />
    </NodeViewWrapper>
  );
};

export const DETAILS_VIEW: Partial<NodeConfig> = {
  addNodeView() {
    return ReactNodeViewRenderer(DetailsNodeView);
  },

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { selection, doc } = editor.state;
        const { $from } = selection;

        if ($from.parentOffset === 0 && $from.depth >= 1) {
          const beforePos = $from.before();
          if (beforePos > 0) {
            const nodeBefore = doc.resolve(beforePos - 1).nodeBefore;
            if (nodeBefore?.type.name === "details") {
              return true;
            }
          }
        }

        return false;
      },
    };
  },
};
