const SVG_DATA_PREFIX = "data:image/svg+xml;charset=utf-8,";
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const SVG_DATA_URI = /^data:image\/svg\+xml[;,]/i;
const SVG_WITHOUT_NS = /<svg\b(?![^>]*\sxmlns=)/i;
const SVG_ROOT = /<svg\b[^>]*>/i;
const PIXEL_LENGTH = /^\s*([\d.]+)\s*(px)?\s*$/i;

export interface SvgSize {
  width: number;
  height: number;
}

const rootAttr = (tag: string, name: string) =>
  tag.match(new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1];

const pixels = (value?: string) => {
  const match = value?.match(PIXEL_LENGTH);
  const parsed = match ? Number(match[1]) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const viewBoxSize = (value?: string): SvgSize | null => {
  const [, , width, height] = (value || "").trim().split(/[\s,]+/).map(Number);
  return width > 0 && height > 0 ? { width, height } : null;
};

export const svgNaturalSize = (svg: string): SvgSize | null => {
  const tag = svg.match(SVG_ROOT)?.[0];
  if (!tag) return null;
  const box = viewBoxSize(rootAttr(tag, "viewBox"));
  if (box) return { width: Math.round(box.width), height: Math.round(box.height) };
  const width = pixels(rootAttr(tag, "width"));
  const height = pixels(rootAttr(tag, "height"));
  return width && height ? { width: Math.round(width), height: Math.round(height) } : null;
};

export const toSvgSrc = (svg: string): string => {
  const trimmed = svg.trim();
  if (SVG_DATA_URI.test(trimmed)) return trimmed;

  const namespaced = trimmed.replace(SVG_WITHOUT_NS, `<svg xmlns="${SVG_NAMESPACE}"`);
  return `${SVG_DATA_PREFIX}${encodeURIComponent(namespaced)}`;
};
