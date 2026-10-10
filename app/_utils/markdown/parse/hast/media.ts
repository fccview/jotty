import { stylePixels } from "@/app/_utils/markdown/style";
import { isElement, isText, type HastRule } from "./types";

export const imageRule: HastRule = {
  element: (node) => {
    if (node.tagName !== "img" || !node.properties?.style) return;
    const style = String(node.properties.style);
    const width = stylePixels(style, "width");
    const height = stylePixels(style, "height");
    if (width) node.properties.width = width;
    if (height) node.properties.height = height;
  },
};

export const unwrapImageRule: HastRule = {
  element: (node) => {
    if (node.tagName !== "p") return;
    const meaningful = node.children.filter((child) => !(isText(child) && !child.value.trim()));
    if (meaningful.length !== 1 || !isElement(meaningful[0], "img")) return;
    const image = meaningful[0];
    node.tagName = image.tagName;
    node.properties = image.properties;
    node.children = [];
  },
};
