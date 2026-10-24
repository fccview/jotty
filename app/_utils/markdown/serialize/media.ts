import { stylePixels } from "@/app/_utils/markdown/style";
import { escapeHtmlAttr, escapeLabel } from "./escape";
import { NodeName, type BlockWriter } from "./types";

const destination = (url: string) => (/[\s()<>]/.test(url) ? `<${url}>` : url);

const pixels = (value: unknown) => {
  const number = String(value ?? "").trim();
  return number && number !== "0" ? number : "";
};

const sizeAttrs = (style: string, width: string, height: string) => {
  const sized = stylePixels(style, "width") || stylePixels(style, "height");
  const matches = (name: string, value: string) => (stylePixels(style, name) ?? "") === value;
  if (!sized) {
    const own = [width && `width="${width}"`, height && `height="${height}"`].filter(Boolean);
    return style ? [`style="${escapeHtmlAttr(style)}"`, ...own] : own;
  }
  if ((!width && !height) || (matches("width", width) && matches("height", height))) {
    return [`style="${escapeHtmlAttr(style)}"`];
  }
  return [`style="${[width && `width: ${width}px`, height && `height: ${height}px`].filter(Boolean).join("; ")}"`];
};

const htmlImage = (attrs: Record<string, unknown>, width: string, height: string) => {
  const parts = [`src="${escapeHtmlAttr(String(attrs.src))}"`];
  if (attrs.alt != null) parts.push(`alt="${escapeHtmlAttr(String(attrs.alt))}"`);
  if (attrs.title) parts.push(`title="${escapeHtmlAttr(String(attrs.title))}"`);
  parts.push(...sizeAttrs(String(attrs.style ?? "").trim(), width, height));
  return `<img ${parts.join(" ")} />`;
};

export const image: BlockWriter = (node) => {
  const { src, alt, title, width, height } = node.attrs || {};
  if (!src) return "";
  const w = pixels(width);
  const h = pixels(height);
  if (w || h || String(node.attrs?.style ?? "").trim()) return htmlImage(node.attrs || {}, w, h);
  const titlePart = title ? ` "${String(title).replace(/"/g, '\\"')}"` : "";
  return `![${escapeLabel(alt || "")}](${destination(src)}${titlePart})`;
};

const ATTACHMENT_ICONS: Record<string, string> = { video: "🎥", file: "📎" };

export const fileAttachment: BlockWriter = (node) => {
  const { url, fileName, type } = node.attrs || {};
  if (!url) return "";
  const name = escapeLabel(fileName || "");
  if (type === "image") return `![${name}](${destination(url)})`;
  return `[${ATTACHMENT_ICONS[type] ?? ATTACHMENT_ICONS.file} ${name}](${destination(url)})`;
};

export const MEDIA_BLOCKS = {
  [NodeName.Image]: image,
  [NodeName.FileAttachment]: fileAttachment,
};
