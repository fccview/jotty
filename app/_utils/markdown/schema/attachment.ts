import { Node, mergeAttributes } from "@tiptap/core";
import { NodeName } from "@/app/_utils/markdown/serialize/types";

export interface AttachmentOptions {
  HTMLAttributes: Record<string, string>;
}

export const AttachmentNode = Node.create<AttachmentOptions>({
  name: NodeName.FileAttachment,
  group: "block",
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      url: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-url"),
        renderHTML: (attributes) => (attributes.url ? { "data-url": attributes.url } : {}),
      },
      fileName: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-file-name"),
        renderHTML: (attributes) => (attributes.fileName ? { "data-file-name": attributes.fileName } : {}),
      },
      mimeType: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-mime-type"),
        renderHTML: (attributes) => (attributes.mimeType ? { "data-mime-type": attributes.mimeType } : {}),
      },
      type: {
        default: "file",
        parseHTML: (element) => element.getAttribute("data-type") || "file",
        renderHTML: (attributes) => ({ "data-type": attributes.type }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "p[data-file-attachment]",
        getAttrs: (element) => ({
          url: element.getAttribute("data-url"),
          fileName: element.getAttribute("data-file-name"),
          mimeType: element.getAttribute("data-mime-type"),
          type: element.getAttribute("data-type") || "file",
        }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "p",
      mergeAttributes(
        {
          "data-file-attachment": "",
          "data-url": node.attrs.url,
          "data-file-name": node.attrs.fileName,
          "data-mime-type": node.attrs.mimeType,
          "data-type": node.attrs.type,
        },
        this.options.HTMLAttributes,
        HTMLAttributes,
      ),
      `[📎 ${node.attrs.fileName}](${node.attrs.url})`,
    ];
  },
});
