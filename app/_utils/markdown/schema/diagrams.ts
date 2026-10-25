import { Node, mergeAttributes } from "@tiptap/core";
import type { DOMOutputSpec } from "@tiptap/pm/model";
import { DEFAULT_DRAWIO_URL } from "@/app/_consts/diagrams";
import { DiagramKind, DiagramTheme, toDiagramTheme } from "@/app/_utils/markdown/diagram-comment";
import { NodeName } from "@/app/_utils/markdown/serialize/types";

export interface DrawioOptions {
  drawioUrl?: string;
  drawioProxyEnabled?: boolean;
}

const DIAGRAM_LABELS: Record<DiagramKind, string> = {
  [DiagramKind.Drawio]: "[Draw.io Diagram]",
  [DiagramKind.Excalidraw]: "[Excalidraw Diagram]",
};

const optional = (name: string, value: unknown) => (value ? { [name]: value } : {});

const diagramAttrs = (kind: DiagramKind) => ({
  diagramData: {
    default: null,
    parseHTML: (element: HTMLElement) => element.getAttribute(`data-${kind}-data`) || null,
    renderHTML: (attributes: Record<string, unknown>) => optional(`data-${kind}-data`, attributes.diagramData),
  },
  svgData: {
    default: null,
    parseHTML: (element: HTMLElement) => element.getAttribute(`data-${kind}-svg`) || null,
    renderHTML: (attributes: Record<string, unknown>) => optional(`data-${kind}-svg`, attributes.svgData),
  },
  themeMode: {
    default: DiagramTheme.Light,
    parseHTML: (element: HTMLElement) => element.getAttribute(`data-${kind}-theme`) || DiagramTheme.Light,
    renderHTML: (attributes: Record<string, unknown>) => ({
      [`data-${kind}-theme`]: attributes.themeMode || DiagramTheme.Light,
    }),
  },
});

const diagramRule = (kind: DiagramKind) => ({
  tag: `div[data-${kind}]`,
  getAttrs: (element: HTMLElement) => ({
    diagramData: element.getAttribute(`data-${kind}-data`) || null,
    svgData: element.getAttribute(`data-${kind}-svg`) || null,
    themeMode: toDiagramTheme(element.getAttribute(`data-${kind}-theme`)),
  }),
});

const diagramHtml = (kind: DiagramKind, attrs: Record<string, string | null>): DOMOutputSpec => [
  "div",
  mergeAttributes({
    [`data-${kind}`]: "",
    [`data-${kind}-data`]: attrs.diagramData || "",
    [`data-${kind}-svg`]: attrs.svgData || "",
    [`data-${kind}-theme`]: attrs.themeMode || DiagramTheme.Light,
  }),
  DIAGRAM_LABELS[kind],
];

export const MermaidNode = Node.create({
  name: NodeName.Mermaid,
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      content: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-mermaid-content") || "",
        renderHTML: (attributes) => optional("data-mermaid-content", attributes.content),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-mermaid]",
        getAttrs: (element) => ({
          content: element.getAttribute("data-mermaid-content") || "",
        }),
      },
    ];
  },

  renderHTML({ node }) {
    return [
      "div",
      mergeAttributes({
        "data-mermaid": "",
        "data-mermaid-content": node.attrs.content,
      }),
      "[Mermaid Diagram]",
    ];
  },
});

export const DrawioNode = Node.create<DrawioOptions>({
  name: NodeName.Drawio,
  group: "block",
  atom: true,
  draggable: true,

  addOptions() {
    return {
      drawioUrl: DEFAULT_DRAWIO_URL,
      drawioProxyEnabled: false,
    };
  },

  addAttributes: () => diagramAttrs(DiagramKind.Drawio),

  parseHTML: () => [diagramRule(DiagramKind.Drawio)],

  renderHTML: ({ node }) => diagramHtml(DiagramKind.Drawio, node.attrs),
});

export const ExcalidrawNode = Node.create({
  name: NodeName.Excalidraw,
  group: "block",
  atom: true,
  draggable: true,

  addAttributes: () => diagramAttrs(DiagramKind.Excalidraw),

  parseHTML: () => [diagramRule(DiagramKind.Excalidraw)],

  renderHTML: ({ node }) => diagramHtml(DiagramKind.Excalidraw, node.attrs),
});
