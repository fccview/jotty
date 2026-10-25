import { Node, mergeAttributes } from "@tiptap/core";
import { NodeName } from "@/app/_utils/markdown/serialize/types";

export const DEFAULT_SUMMARY = "Details";

export const DetailsNode = Node.create({
  name: NodeName.Details,
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      summary: {
        default: DEFAULT_SUMMARY,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "details",
        getAttrs: (dom) => {
          const summaryElement = (dom as HTMLElement).querySelector("summary");
          return { summary: summaryElement?.textContent || DEFAULT_SUMMARY };
        },
        contentElement: (dom: HTMLElement) => {
          dom.querySelector("summary")?.remove();
          return dom.querySelector("div") || dom;
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
});
