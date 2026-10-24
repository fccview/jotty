import { isItemHref, parseItemHref } from "@/app/_utils/item-href-utils";
import { isText, textOf, element, type HastRule } from "./types";

export const internalLinkRule: HastRule = {
  element: (node) => {
    if (node.tagName !== "a" || !node.properties?.href) return;
    const href = String(node.properties.href);
    if (!isItemHref(href)) return;

    const title = node.children.length === 1 && isText(node.children[0])
      ? node.children[0].value
      : textOf(node);
    const target = parseItemHref(href);
    const uuid = target?.uuid || "";

    node.tagName = "span";
    node.properties = {
      "data-internal-link": "",
      "data-href": href,
      "data-title": title,
      "data-uuid": uuid,
      "data-type": target?.type || "",
      "data-category": target?.legacy?.category || "",
      "data-item-id": target?.legacy?.id || uuid,
    };
    node.children = [element("span", { class: "title" }, [{ type: "text", value: title }])];
  },
};
