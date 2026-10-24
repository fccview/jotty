import { base64ToSvg } from "@/app/_utils/base64-utils";
import { DiagramKind, DiagramTheme, toDiagramTheme } from "@/app/_utils/markdown/diagram-comment";

type Props = Record<string, unknown>;

interface HastLike {
  properties?: Props;
}

export interface DiagramView {
  kind: DiagramKind;
  svg: string;
  data: string;
  theme: DiagramTheme;
}

const KINDS = [DiagramKind.Drawio, DiagramKind.Excalidraw];
const SVG_DATA_URI = /^data:image\/svg\+xml[;,]/i;

const camel = (name: string) => name.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());

const read = (props: Props, node: HastLike | undefined, name: string) => {
  const value = props[name] ?? props[camel(name)] ?? node?.properties?.[name] ?? node?.properties?.[camel(name)];
  return value === undefined || value === null ? undefined : String(value);
};

const decodeSvg = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith("<") || SVG_DATA_URI.test(trimmed)) return trimmed;
  try {
    return base64ToSvg(trimmed);
  } catch (error) {
    console.error("Failed to decode diagram preview:", error);
    return "";
  }
};

export const diagramProps = (props: Props, node?: HastLike): DiagramView | null => {
  const kind = KINDS.find((candidate) => read(props, node, `data-${candidate}`) !== undefined);
  if (!kind) return null;
  return {
    kind,
    svg: decodeSvg(read(props, node, `data-${kind}-svg`) || ""),
    data: read(props, node, `data-${kind}-data`) || "",
    theme: toDiagramTheme(read(props, node, `data-${kind}-theme`)),
  };
};
