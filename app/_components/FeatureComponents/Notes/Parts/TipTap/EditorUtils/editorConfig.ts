import { ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import ListItem from "@tiptap/extension-list-item";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import BulletList from "@tiptap/extension-bullet-list";
import Underline from "@tiptap/extension-underline";
import HardBreak from "@tiptap/extension-hard-break";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { BubbleMenu } from "@tiptap/extension-bubble-menu";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { InputRule } from "@tiptap/core";
import { lowlight } from "@/app/_utils/lowlight-utils";
import { FileAttachmentExtension } from "@/app/_components/FeatureComponents/Notes/Parts/FileAttachment/FileAttachmentExtension";
import { CodeBlockNodeView } from "@/app/_components/FeatureComponents/Notes/Parts/CodeBlock/CodeBlockNodeView";
import { DetailsExtension } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/DetailsExtension";
import { KeyboardShortcuts } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/KeyboardShortcuts";
import { OverlayExtension } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/OverlayExtension";
import { SlashCommands } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/SlashCommands";
import { generateCustomHtmlExtensions } from "@/app/_utils/custom-html-utils";

interface OverlayCallbacks {
  onImageClick: (position: any) => void;
  onTableSelect: (position: any) => void;
}

interface EditorSettings {
  enableSlashCommands: boolean;
  enableBubbleMenu: boolean;
  enableTableToolbar: boolean;
}

export const createEditorExtensions = (callbacks: OverlayCallbacks, editorSettings?: EditorSettings) => {
  const settings = editorSettings || {
    enableSlashCommands: true,
    enableBubbleMenu: true,
    enableTableToolbar: true,
  };

  const extensions = [
    StarterKit.configure({
      codeBlock: false,
      underline: false,
      link: false,
      listItem: false,
      bulletList: false,
      hardBreak: false,
    }),
    ...generateCustomHtmlExtensions(),
    DetailsExtension,
    KeyboardShortcuts,
    OverlayExtension.configure({
      onImageClick: callbacks.onImageClick,
      onTableSelect: callbacks.onTableSelect,
    }),
    TextStyle,
    Color,
    Highlight.configure({
      multicolor: true,
    }),
    ...(settings.enableSlashCommands ? [SlashCommands] : []),
    Underline,
    HardBreak,
    CodeBlockLowlight.configure({
      lowlight,
      defaultLanguage: "plaintext",
    }).extend({
      addNodeView() {
        return ReactNodeViewRenderer(CodeBlockNodeView);
      },
    }),
    Link.configure({
      openOnClick: false,
    }).extend({
      addInputRules() {
        return [
          new InputRule({
            find: /\[([^\]]+)\]\(([^)]+)\)/,
            handler: ({ state, range, match }) => {
              const { tr } = state;
              const text = match[1];
              const href = match[2];
              tr.replaceWith(
                range.from,
                range.to,
                state.schema.text(text, [
                  state.schema.marks.link.create({ href }),
                ])
              );
            },
          }),
        ];
      },
    }),
    Image.configure({
      HTMLAttributes: {},
    }),
    FileAttachmentExtension.configure({
      HTMLAttributes: {
        class: "file-attachment",
      },
    }),
    Table.extend({
      content: "tableRow+",
    }).configure({
      resizable: true,
    }),
    TableRow.extend({
      content: "(tableHeader | tableCell)*",
    }),
    TableHeader.extend({
      content: "block+",
    }),
    TableCell.extend({
      content: "block+",
    }),
    ListItem.extend({
      content: "block+",
    }),
    TaskList,
    TaskItem.extend({
      nested: true,
      content: "block+",
      parseHTML() {
        return [
          {
            tag: 'li[data-type="taskItem"]',
            priority: 51,
            getAttrs: (element: HTMLElement) => {
              if (typeof element === "string") return false;
              const dataChecked = element.getAttribute("data-checked");
              return {
                checked: dataChecked === "true",
              };
            },
          },
        ];
      },
    }),
    BulletList.extend({
      content: "listItem+",
    }),
  ];

  return extensions;
};
