import type { TableSyntax } from "@/app/_types";

export interface MarkJson {
  type: string;
  attrs?: Record<string, any>;
}

export interface NodeJson {
  type: string;
  attrs?: Record<string, any>;
  content?: NodeJson[];
  marks?: MarkJson[];
  text?: string;
}

export interface SerializeOptions {
  tableSyntax?: TableSyntax;
  renderHtml?: (node: NodeJson) => string;
}

export interface BlockContext {
  options: SerializeOptions;
  inTable?: boolean;
  inHeading?: boolean;
  soleChild?: boolean;
  bullet?: string;
  delimiter?: string;
}

export interface Serializer {
  blocks: (nodes: NodeJson[] | undefined, context: BlockContext) => string;
  block: (node: NodeJson, context: BlockContext) => string;
  inline: (nodes: NodeJson[] | undefined, context: BlockContext) => string;
}

export type BlockWriter = (node: NodeJson, context: BlockContext, serializer: Serializer) => string;

export enum NodeName {
  Doc = "doc",
  Paragraph = "paragraph",
  Heading = "heading",
  Blockquote = "blockquote",
  HorizontalRule = "horizontalRule",
  BulletList = "bulletList",
  OrderedList = "orderedList",
  TaskList = "taskList",
  ListItem = "listItem",
  TaskItem = "taskItem",
  CodeBlock = "codeBlock",
  Image = "image",
  Table = "table",
  TableRow = "tableRow",
  TableHeader = "tableHeader",
  TableCell = "tableCell",
  Details = "details",
  Callout = "callout",
  Mermaid = "mermaid",
  Drawio = "drawio",
  Excalidraw = "excalidraw",
  FileAttachment = "fileAttachment",
  Text = "text",
  HardBreak = "hardBreak",
  InternalLink = "internalLink",
  TagLink = "tagLink",
  RawBlock = "rawBlock",
  RawInline = "rawInline",
}

export enum MarkName {
  Bold = "bold",
  Italic = "italic",
  Strike = "strike",
  Code = "code",
  Link = "link",
  Underline = "underline",
  Highlight = "highlight",
  Mark = "mark",
  TextStyle = "textStyle",
  FontFamily = "fontFamily",
  Kbd = "kbd",
  Subscript = "subscript",
  Superscript = "superscript",
  Abbreviation = "abbreviation",
}

export const LIST_TYPES = new Set<string>([NodeName.BulletList, NodeName.OrderedList, NodeName.TaskList]);

export const indent = (text: string, prefix: string, first = prefix) =>
  text
    .split("\n")
    .map((line, index) => {
      const lead = index === 0 ? first : prefix;
      return line ? lead + line : lead.trimEnd();
    })
    .join("\n");
