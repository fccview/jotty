import * as MarkdownUtils from "@/app/_utils/markdown-editor-utils";

type FormatFunction = (ta: HTMLTextAreaElement) => string;

interface ShortcutConfig {
  key: string;
  shift?: boolean;
  alt?: boolean;
  action: FormatFunction;
}

export const FORMAT_SHORTCUTS: ShortcutConfig[] = [
  { key: "b", action: MarkdownUtils.insertBold },
  { key: "i", action: MarkdownUtils.insertItalic },
  { key: "u", action: MarkdownUtils.insertUnderline },
  { key: "e", action: MarkdownUtils.insertInlineCode },
  { key: "x", shift: true, action: MarkdownUtils.insertStrikethrough },
  { key: "X", shift: true, action: MarkdownUtils.insertStrikethrough },
  { key: "b", shift: true, action: MarkdownUtils.insertBlockquote },
  { key: "B", shift: true, action: MarkdownUtils.insertBlockquote },
  { key: "7", shift: true, action: MarkdownUtils.insertOrderedList },
  { key: "&", shift: true, action: MarkdownUtils.insertOrderedList },
  { key: "8", shift: true, action: MarkdownUtils.insertBulletList },
  { key: "*", shift: true, action: MarkdownUtils.insertBulletList },
  { key: "9", shift: true, action: MarkdownUtils.insertTaskList },
  { key: "(", shift: true, action: MarkdownUtils.insertTaskList },
  { key: "h", shift: true, action: MarkdownUtils.insertHighlight },
  { key: "H", shift: true, action: MarkdownUtils.insertHighlight },
  { key: "1", alt: true, action: (ta) => MarkdownUtils.insertHeading(ta, 1) },
  { key: "2", alt: true, action: (ta) => MarkdownUtils.insertHeading(ta, 2) },
  { key: "3", alt: true, action: (ta) => MarkdownUtils.insertHeading(ta, 3) },
  { key: "4", alt: true, action: (ta) => MarkdownUtils.insertHeading(ta, 4) },
  { key: "5", alt: true, action: (ta) => MarkdownUtils.insertHeading(ta, 5) },
  { key: "6", alt: true, action: (ta) => MarkdownUtils.insertHeading(ta, 6) },
  {
    key: "c",
    alt: true,
    action: (ta) => MarkdownUtils.insertCodeBlock(ta, ""),
  },
];
