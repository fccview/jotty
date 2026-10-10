import { base64ToSvg, base64ToText } from "@/app/_utils/base64-utils";
import type { HastRule } from "./types";

const DIAGRAMS = [
  { marker: "drawio-diagram", attr: "drawio", label: "[Draw.io Diagram]", needsSvg: true, svg: base64ToSvg },
  { marker: "excalidraw-diagram", attr: "excalidraw", label: "[Excalidraw Diagram]", needsSvg: false, svg: base64ToText },
];

const field = (comment: string, name: string) =>
  comment.match(new RegExp(`${name}:\\s*([^\\n]+)`))?.[1]?.trim();

export const diagramRule: HastRule = {
  comment: (node) => {
    const value = String(node.value || "");
    const diagram = DIAGRAMS.find((entry) => value.includes(entry.marker));
    if (!diagram) return;
    const data = field(value, "data");
    const svg = field(value, "svg");
    if (!data || (diagram.needsSvg && !svg)) return;
    try {
      const target = node as unknown as Record<string, unknown>;
      target.type = "element";
      target.tagName = "div";
      target.properties = {
        [`data-${diagram.attr}`]: "",
        [`data-${diagram.attr}-data`]: base64ToText(data),
        [`data-${diagram.attr}-svg`]: svg ? diagram.svg(svg) : "",
        [`data-${diagram.attr}-theme`]: field(value, "theme") || "light",
      };
      target.children = [{ type: "text", value: diagram.label }];
      delete target.value;
    } catch (error) {
      console.error(`Failed to decode ${diagram.attr} diagram:`, error);
    }
  },
};
