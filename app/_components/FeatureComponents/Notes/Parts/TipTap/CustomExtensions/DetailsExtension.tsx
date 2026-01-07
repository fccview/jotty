import { Node, mergeAttributes } from "@tiptap/core";
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

export const DetailsExtension = Node.create({
  name: "details",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      summary: {
        default: "Details",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "details",
        getAttrs: (dom) => {
          const summaryElement = (dom as HTMLElement).querySelector("summary");
          return { summary: summaryElement?.textContent || "Details" };
        },
        contentElement: (dom: HTMLElement) => {
          const summaryElement = dom.querySelector("summary");

          if (summaryElement) {
            summaryElement.remove();
          }

          const contentWrapper = dom.querySelector("div");

          return contentWrapper || dom;
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "details",
      mergeAttributes(HTMLAttributes),
      ["summary", node.attrs.summary],
      ["div", 0],
    ];
  },

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
});
