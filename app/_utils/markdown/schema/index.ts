import type { AnyExtension, Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import Underline from "@tiptap/extension-underline";
import { CodeBlock } from "@tiptap/extension-code-block";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { generateCustomHtmlExtensions } from "@/app/_utils/custom-html-utils";
import { PLAIN_CODE_LANGUAGE } from "@/app/_utils/markdown/consts";
import { CalloutNode } from "./callout";
import { DetailsNode } from "./details";
import { DrawioNode, ExcalidrawNode, MermaidNode } from "./diagrams";
import { InternalLinkNode, TagLinkNode } from "./links";
import { RawBlockNode, RawInlineNode } from "./raw";
import { AttachmentNode } from "./attachment";
import {
  BlockBulletList,
  BlockListItem,
  BlockTaskItem,
  JottyHighlight,
  SoftHardBreak,
  StyledImage,
  TABLE_PARTS,
} from "./tweaks";

export const STARTER_KIT = "starterKit";

export type SchemaLayer = (extension: AnyExtension) => Extensions;

const alone: SchemaLayer = (extension) => [extension];

const headless = (): Extensions => [
  StarterKit.configure({
    codeBlock: false,
    underline: false,
    link: false,
    listItem: false,
    bulletList: false,
    hardBreak: false,
    code: {
      HTMLAttributes: { spellcheck: "false" },
    },
  }),
  ...generateCustomHtmlExtensions(),
  DetailsNode,
  CalloutNode,
  TextStyle,
  Color,
  JottyHighlight,
  InternalLinkNode,
  TagLinkNode,
  Underline,
  SoftHardBreak,
  CodeBlock.configure({ defaultLanguage: PLAIN_CODE_LANGUAGE }),
  Link.configure({ openOnClick: false }),
  StyledImage,
  AttachmentNode.configure({ HTMLAttributes: { class: "file-attachment" } }),
  MermaidNode,
  DrawioNode,
  ExcalidrawNode,
  RawBlockNode,
  RawInlineNode,
  ...TABLE_PARTS,
  BlockListItem,
  TaskList,
  BlockTaskItem,
  BlockBulletList,
];

export const schemaExtensions = (layer: SchemaLayer = alone): Extensions =>
  headless().flatMap((extension) => layer(extension));
