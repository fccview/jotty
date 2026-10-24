import { base64ToSvg } from "@/app/_utils/base64-utils";
import { svgNaturalSize } from "@/app/_utils/svg-frame-utils";

export enum DrawioEvent {
  Init = "init",
  Save = "save",
  Export = "export",
  Exit = "exit",
}

export enum DrawioAction {
  Load = "load",
  Export = "export",
  Status = "status",
}

export interface DrawioMessage {
  event: string;
  xml?: unknown;
  data?: unknown;
  exit?: unknown;
  [key: string]: unknown;
}

export const EMPTY_DRAWIO_MODEL =
  '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>';

const DIAGRAMS_NET = "diagrams.net";
const SVG_BASE64 = "data:image/svg+xml;base64,";
const SVG_UTF8 = /^data:image\/svg\+xml(?:;charset=[^,]*)?,/i;
const HTTPS = "https:";

const EMBED_PARAMS: Record<string, string> = {
  embed: "1",
  ui: "kennedy",
  spin: "1",
  proto: "json",
  saveAndExit: "1",
  noSaveBtn: "0",
};

interface EmbedOptions {
  dark: boolean;
  locale: string;
}

export const drawioEmbedUrl = (baseUrl: string, { dark, locale }: EmbedOptions) => {
  const origin = typeof window === "undefined" ? "http://localhost" : window.location.origin;
  const url = new URL(`${baseUrl.replace(/\/+$/, "")}/`, origin);
  Object.entries(EMBED_PARAMS).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.set("dark", dark ? "1" : "0");
  url.searchParams.set("lang", locale);
  return url.toString();
};

const isDiagramsNet = (origin: string) => {
  try {
    const { protocol, hostname } = new URL(origin);
    return protocol === HTTPS && (hostname === DIAGRAMS_NET || hostname.endsWith(`.${DIAGRAMS_NET}`));
  } catch {
    return false;
  }
};

export const isTrustedDrawioOrigin = (origin: string, expected: string) =>
  origin === expected || (isDiagramsNet(expected) && isDiagramsNet(origin));

export const readDrawioMessage = (data: unknown): DrawioMessage | null => {
  if (typeof data !== "string" || !data) return null;
  try {
    const parsed: unknown = JSON.parse(data);
    if (typeof parsed !== "object" || parsed === null) return null;
    const message = parsed as Record<string, unknown>;
    return typeof message.event === "string" ? (message as DrawioMessage) : null;
  } catch (error) {
    console.warn("Ignored a draw.io message that was not JSON:", error);
    return null;
  }
};

export const readDrawioSvg = (data: unknown): string | null => {
  if (typeof data !== "string" || !data) return null;
  try {
    if (data.startsWith(SVG_BASE64)) return base64ToSvg(data.slice(SVG_BASE64.length));
    if (SVG_UTF8.test(data)) return decodeURIComponent(data.replace(SVG_UTF8, ""));
    return data.trimStart().startsWith("<") ? data : null;
  } catch (error) {
    console.error("Failed to decode draw.io SVG:", error);
    return null;
  }
};

const EMPTY_EXPORT_SIZE = 1;

export const isBlankDrawioSvg = (svg: string) => {
  const size = svgNaturalSize(svg);
  return !size || (size.width <= EMPTY_EXPORT_SIZE && size.height <= EMPTY_EXPORT_SIZE);
};
