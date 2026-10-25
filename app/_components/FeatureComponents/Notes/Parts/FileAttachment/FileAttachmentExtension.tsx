import type { NodeConfig } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { FileAttachmentNode } from "./FileAttachmentNode";
import { InputRule } from "@tiptap/core";
import { mimeOf, urlKind } from "@/app/_consts/attachments";
import type { AttachmentOptions } from "@/app/_utils/markdown/schema/attachment";

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

export const FILE_ATTACHMENT_VIEW: Partial<NodeConfig<AttachmentOptions>> = {
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

          commands.insertContent({
            type: this.name,
            attrs: {
              url,
              fileName,
              mimeType: mimeOf(fileName),
              type: urlKind(url),
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
};
