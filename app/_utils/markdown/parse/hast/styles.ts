import type { HastRule } from "./types";

const styleValue = (style: string, name: string) =>
  style.match(new RegExp(`(?:^|;|\\s)${name}:\\s*([^;]+)`))?.[1]?.trim();

export const styleRule: HastRule = {
  element: (node) => {
    if (!node.properties?.style) return;
    const style = String(node.properties.style);
    if (node.tagName === "span") {
      const color = styleValue(style, "color");
      const background = styleValue(style, "background-color");
      if (color) node.properties["data-color"] = color;
      if (background) node.properties["data-highlight"] = background;
    }
    if (node.tagName === "mark") {
      const background = styleValue(style, "background-color");
      if (background) node.properties["data-highlight"] = background;
    }
  },
};
