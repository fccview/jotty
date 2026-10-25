import { Node, mergeAttributes } from "@tiptap/core";
import type { CalloutType } from "@/app/_consts/callouts";
import { NodeName } from "@/app/_utils/markdown/serialize/types";

export const DEFAULT_CALLOUT: CalloutType = "info";

export const CalloutNode = Node.create({
  name: NodeName.Callout,
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      type: {
        default: DEFAULT_CALLOUT,
        parseHTML: (element) =>
          (element.getAttribute("data-callout-type") as CalloutType) || DEFAULT_CALLOUT,
        renderHTML: (attributes) => ({
          "data-callout-type": attributes.type,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="callout"]',
        getAttrs: (dom) => ({
          type: (dom as HTMLElement).getAttribute("data-callout-type") || DEFAULT_CALLOUT,
        }),
        contentElement: (dom: HTMLElement) => dom.querySelector(".callout-content") || dom,
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const type = node.attrs.type || DEFAULT_CALLOUT;

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "callout",
        "data-callout-type": type,
        class: `callout callout-${type}`,
      }),
      [
        "div",
        { class: "callout-wrapper" },
        ["span", { class: `callout-icon callout-icon-${type}` }],
        ["div", { class: "callout-content" }, 0],
      ],
    ];
  },
});
