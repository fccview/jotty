import { ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import ListItem from "@tiptap/extension-list-item";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import BulletList from "@tiptap/extension-bullet-list";
import TextUnderlineIcon from "@tiptap/extension-underline";
import HardBreak from "@tiptap/extension-hard-break";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { CodeBlock } from "@tiptap/extension-code-block";
import { PrismPlugin } from "./prismPlugin";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { FileAttachmentExtension } from "@/app/_components/FeatureComponents/Notes/Parts/FileAttachment/FileAttachmentExtension";
import { CodeBlockNodeView } from "@/app/_components/FeatureComponents/Notes/Parts/CodeBlock/CodeBlockNodeView";
import { DetailsExtension } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/DetailsExtension";
import { KeyboardShortcuts } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/KeyboardShortcuts";
import { OverlayExtension } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/OverlayExtension";
import { SlashCommands } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/SlashCommands";
import { InternalLink } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/InternalLink";
import { MermaidExtension } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/MermaidExtension";
import { DrawioExtension } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/DrawioExtension";
import { ExcalidrawExtension } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/ExcalidrawExtension";
import { generateCustomHtmlExtensions } from "@/app/_utils/custom-html-utils";
import { getContrastColor } from "@/app/_utils/color-utils";

interface OverlayCallbacks {
  onImageClick: (position: any) => void;
  onTableSelect: (position: any) => void;
}

interface EditorSettings {
  enableSlashCommands: boolean;
  enableBubbleMenu: boolean;
  enableTableToolbar: boolean;
  enableBilateralLinks: boolean;
  drawioUrl?: string;
  drawioProxyEnabled?: boolean;
}

interface EditorData {
  notes?: any[];
  checklists?: any[];
  username?: string;
}

export const createEditorExtensions = (
  callbacks: OverlayCallbacks,
  editorSettings?: EditorSettings,
  editorData?: EditorData
) => {
  const settings = editorSettings || {
    enableSlashCommands: true,
    enableBubbleMenu: true,
    enableTableToolbar: true,
    enableBilateralLinks: true,
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
    }).extend({
      addAttributes() {
        return {
          color: {
            default: null,
            parseHTML: (element) =>
              element.getAttribute("data-color") ||
              element.style.backgroundColor,
            renderHTML: (attributes) => {
              if (!attributes.color) {
                return {};
              }
              const bgColor = attributes.color;
              const textColor = getContrastColor(bgColor);
              return {
                "data-color": bgColor,
                style: `background-color: ${bgColor}; color: ${textColor}`,
              };
            },
          },
        };
      },
    }),
    SlashCommands.configure({
      notes: editorData?.notes || [],
      checklists: editorData?.checklists || [],
      username: editorData?.username || "",
      enableBilateralLinks: settings.enableBilateralLinks,
      enableSlashCommands: settings.enableSlashCommands,
    }),
    InternalLink,
    TextUnderlineIcon,
    HardBreak,
    CodeBlock.extend({
      addNodeView() {
        return ReactNodeViewRenderer(CodeBlockNodeView);
      },
      addProseMirrorPlugins() {
        return [
          PrismPlugin({
            name: this.name,
            defaultLanguage: "plaintext",
          }),
        ];
      },
    }).configure({
      defaultLanguage: "plaintext",
    }),
    Link.configure({
      openOnClick: false,
    }),
    Image.extend({
      addAttributes() {
        return {
          ...this.parent?.(),
          style: {
            default: null,
            parseHTML: (element) => element.getAttribute("style"),
            renderHTML: (attributes) => {
              if (!attributes.style) {
                return {};
              }
              return {
                style: attributes.style,
              };
            },
          },
        };
      },
    }).configure({
      HTMLAttributes: {},
    }),
    FileAttachmentExtension.configure({
      HTMLAttributes: {
        class: "file-attachment",
      },
    }),
    MermaidExtension,
    DrawioExtension.configure({
      drawioUrl: settings.drawioUrl || "https://embed.diagrams.net",
      drawioProxyEnabled: settings.drawioProxyEnabled || false,
    }),
    ExcalidrawExtension,
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
    }).configure({
      nested: true,
    }),
    BulletList.extend({
      content: "listItem+",
    }),
  ];

  return extensions;
};
