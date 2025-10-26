import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { FileAttachmentNode } from "./FileAttachmentNode";
import { InputRule } from "@tiptap/core";

export interface FileAttachmentOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fileAttachment: {
      setFileAttachment: (options: {
        url: string;
        fileName: string;
        mimeType: string;
        type: "image" | "video" | "file";
      }) => ReturnType;
    };
  }
}

export const FileAttachmentExtension = Node.create<FileAttachmentOptions>({
  name: "fileAttachment",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  group: "block",

  atom: true,

  addAttributes() {
    return {
      url: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-url"),
        renderHTML: (attributes) => {
          if (!attributes.url) {
            return {};
          }
          return {
            "data-url": attributes.url,
          };
        },
      },
      fileName: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-file-name"),
        renderHTML: (attributes) => {
          if (!attributes.fileName) {
            return {};
          }
          return {
            "data-file-name": attributes.fileName,
          };
        },
      },
      mimeType: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-mime-type"),
        renderHTML: (attributes) => {
          if (!attributes.mimeType) {
            return {};
          }
          return {
            "data-mime-type": attributes.mimeType,
          };
        },
      },
      type: {
        default: "file",
        parseHTML: (element) => element.getAttribute("data-type") || "file",
        renderHTML: (attributes) => {
          return {
            "data-type": attributes.type,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "p[data-file-attachment]",
        getAttrs: (element) => {
          return {
            url: element.getAttribute("data-url"),
            fileName: element.getAttribute("data-file-name"),
            mimeType: element.getAttribute("data-mime-type"),
            type: element.getAttribute("data-type") || "file",
          };
        },
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
        HTMLAttributes
      ),
      `[📎 ${node.attrs.fileName}](${node.attrs.url})`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FileAttachmentNode);
  },

  addCommands() {
    return {
      setFileAttachment:
        (options) =>
          ({ commands }) => {
            return commands.insertContent({
              type: this.name,
              attrs: options,
            });
          },
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\[📎\s+([^\]]+)\]\(([^)]+)\)/g,
        handler: ({ match, commands }) => {
          const [, fileName, url] = match;
          const isImage = url.includes("/api/image/");
          const isVideo = url.includes("/api/video/");

          commands.insertContent({
            type: this.name,
            attrs: {
              url,
              fileName,
              mimeType: isImage ? "image/jpeg" : isVideo ? "video/mp4" : "application/octet-stream",
              type: isImage ? "image" : isVideo ? "video" : "file",
            },
          });
        },
      }),
      new InputRule({
        find: /\[🎥\s+([^\]]+)\]\(([^)]+)\)/g,
        handler: ({ match, commands }) => {
          const [, fileName, url] = match;

          commands.insertContent({
            type: this.name,
            attrs: {
              url,
              fileName,
              mimeType: "video/mp4",
              type: "video",
            },
          });
        },
      }),
    ];
  },
});
