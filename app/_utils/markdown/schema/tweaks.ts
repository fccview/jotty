import ListItem from "@tiptap/extension-list-item";
import TaskItem from "@tiptap/extension-task-item";
import BulletList from "@tiptap/extension-bullet-list";
import HardBreak from "@tiptap/extension-hard-break";
import Image from "@tiptap/extension-image";
import { Highlight } from "@tiptap/extension-highlight";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { getContrastColor } from "@/app/_utils/color-utils";
import { SOFT_BREAK_ATTR } from "@/app/_utils/markdown/consts";

export const JottyHighlight = Highlight.configure({
  multicolor: true,
}).extend({
  addKeyboardShortcuts() {
    return {};
  },
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-color") || element.style.backgroundColor,
        renderHTML: (attributes) => {
          if (!attributes.color) return {};
          const bgColor = attributes.color;
          return {
            "data-color": bgColor,
            style: `background-color: ${bgColor}; color: ${getContrastColor(bgColor)}`,
          };
        },
      },
    };
  },
});

export const SoftHardBreak = HardBreak.extend({
  addAttributes() {
    return {
      soft: {
        default: false,
        parseHTML: (element) => element.hasAttribute(SOFT_BREAK_ATTR),
        renderHTML: (attributes) => (attributes.soft ? { [SOFT_BREAK_ATTR]: "" } : {}),
      },
    };
  },
});

export const StyledImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute("style"),
        renderHTML: (attributes) => (attributes.style ? { style: attributes.style } : {}),
      },
    };
  },
}).configure({
  HTMLAttributes: {},
});

export const TABLE_PARTS = [
  Table.extend({ content: "tableRow+" }).configure({ resizable: true }),
  TableRow.extend({ content: "(tableHeader | tableCell)*" }),
  TableHeader.extend({ content: "block+" }),
  TableCell.extend({ content: "block+" }),
];

export const BlockListItem = ListItem.extend({ content: "block+" });

export const BlockTaskItem = TaskItem.extend({
  content: "block+",
  parseHTML() {
    return [
      {
        tag: 'li[data-type="taskItem"]',
        priority: 51,
        getAttrs: (element: HTMLElement) => {
          if (typeof element === "string") return false;
          return { checked: element.getAttribute("data-checked") === "true" };
        },
      },
    ];
  },
}).configure({
  nested: true,
});

export const BlockBulletList = BulletList.extend({ content: "listItem+" });
