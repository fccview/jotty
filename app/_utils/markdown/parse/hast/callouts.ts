import { matchCallout } from "@/app/_utils/callout-utils";
import { isElement, isText, type HastRule } from "./types";

export const calloutRule: HastRule = {
  element: (node) => {
    if (node.tagName !== "blockquote") return;
    const first = node.children.find((child) => isElement(child, "p"));
    if (!isElement(first)) return;
    const text = first.children[0];
    if (!isText(text)) return;
    const callout = matchCallout(text.value);
    if (!callout) return;

    text.value = text.value.slice(callout.marker.length);
    const next = first.children[1];
    if (!text.value && isElement(next, "br")) first.children.splice(1, 1);
    if (!text.value) first.children.shift();
    if (first.children.length === 0) {
      node.children = node.children.filter((child) => child !== first);
    }
    node.tagName = "div";
    node.properties = {
      "data-type": "callout",
      "data-callout-type": callout.type,
      class: `callout callout-${callout.type}`,
    };
  },
};
