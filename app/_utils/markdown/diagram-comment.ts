import type { Element } from "hast";
import { base64ToSvg, base64ToText, utf8ToBase64 } from "@/app/_utils/base64-utils";

export enum DiagramKind {
  Drawio = "drawio",
  Excalidraw = "excalidraw",
}

export enum DiagramTheme {
  Light = "light",
  Dark = "dark",
}

export interface DiagramAttrs {
  diagramData: string | null;
  svgData: string | null;
  themeMode: DiagramTheme;
}

export interface DiagramComment {
  kind: DiagramKind;
  attrs: DiagramAttrs;
}

const LABELS: Record<DiagramKind, string> = {
  [DiagramKind.Drawio]: "[Draw.io Diagram]",
  [DiagramKind.Excalidraw]: "[Excalidraw Diagram]",
};

const SVG_READERS: Record<DiagramKind, (base64: string) => string> = {
  [DiagramKind.Drawio]: base64ToSvg,
  [DiagramKind.Excalidraw]: base64ToText,
};

const MARKER = /^\s*(drawio|excalidraw)-diagram(?:\s|$)/;

const field = (comment: string, name: string) =>
  comment.match(new RegExp(`^[ \\t]*${name}:[ \\t]*(\\S*)`, "m"))?.[1] ?? "";

const decode = (value: string, reader: (base64: string) => string) =>
  value ? reader(value) : null;

export const toDiagramTheme = (value: unknown): DiagramTheme =>
  value === DiagramTheme.Dark ? DiagramTheme.Dark : DiagramTheme.Light;

export const readDiagramComment = (comment: string): DiagramComment | null => {
  const kind = comment.match(MARKER)?.[1] as DiagramKind | undefined;
  if (!kind) return null;
  try {
    return {
      kind,
      attrs: {
        diagramData: decode(field(comment, "data"), base64ToText),
        svgData: decode(field(comment, "svg"), SVG_READERS[kind]),
        themeMode: toDiagramTheme(field(comment, "theme")),
      },
    };
  } catch (error) {
    console.error(`Failed to decode ${kind} diagram:`, error);
    return null;
  }
};

const WHOLE_COMMENT = /^\s*<!--([\s\S]*?)-->\s*$/;
const DIAGRAM_START = /^\s*<!--\s*(drawio|excalidraw)-diagram/i;

export const startsDiagramComment = (html: string) => DIAGRAM_START.test(html);

export const isReadableDiagramBlock = (html: string) => {
  const body = html.match(WHOLE_COMMENT)?.[1];
  return body !== undefined && readDiagramComment(body) !== null;
};

export const writeDiagramComment = (kind: DiagramKind, attrs: Partial<DiagramAttrs>) =>
  [
    `<!-- ${kind}-diagram`,
    `data: ${utf8ToBase64(attrs.diagramData || "")}`,
    `svg: ${utf8ToBase64(attrs.svgData || "")}`,
    `theme: ${toDiagramTheme(attrs.themeMode)}`,
    "-->",
  ].join("\n");

export const diagramElement = ({ kind, attrs }: DiagramComment): Element => ({
  type: "element",
  tagName: "div",
  properties: {
    [`data-${kind}`]: "",
    [`data-${kind}-data`]: attrs.diagramData ?? "",
    [`data-${kind}-svg`]: attrs.svgData ?? "",
    [`data-${kind}-theme`]: attrs.themeMode,
  },
  children: [{ type: "text", value: LABELS[kind] }],
});
