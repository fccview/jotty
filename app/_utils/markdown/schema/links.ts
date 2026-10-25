import { Node } from "@tiptap/core";
import type { DOMOutputSpec } from "@tiptap/pm/model";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { NodeName } from "@/app/_utils/markdown/serialize/types";

export const InternalLinkNode = Node.create({
  name: NodeName.InternalLink,
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      href: { default: null },
      title: { default: null },
      type: { default: "note" },
      category: { default: null },
      uuid: { default: null },
      itemId: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-internal-link]",
        getAttrs: (element) => {
          if (typeof element === "string") return false;
          return {
            href: element.getAttribute("data-href"),
            title: element.getAttribute("data-title"),
            type: element.getAttribute("data-type"),
            category: element.getAttribute("data-category"),
            uuid: element.getAttribute("data-uuid"),
            itemId: element.getAttribute("data-item-id"),
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { href, title, type, category, uuid, itemId } = node.attrs;
    const children: DOMOutputSpec[] = [["span", { class: "title" }, title]];

    if (category && category !== UNCATEGORIZED) {
      children.push(["span", { class: "separator" }, "•"]);
      children.push(["span", { class: "category" }, category.split("/").pop()]);
    }

    return [
      "span",
      {
        "data-internal-link": "",
        "data-href": href,
        "data-title": title,
        "data-type": type,
        "data-category": category || "",
        "data-uuid": uuid || "",
        "data-item-id": itemId || "",
        ...HTMLAttributes,
      },
      ...children,
    ];
  },
});

export const TagLinkNode = Node.create({
  name: NodeName.TagLink,
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      tag: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-tag]",
        getAttrs: (element) => {
          if (typeof element === "string") return false;
          const tag = element.getAttribute("data-tag");
          return tag ? { tag } : false;
        },
      },
    ];
  },

  renderHTML({ node }) {
    return ["span", { "data-tag": node.attrs.tag }, node.attrs.tag] as DOMOutputSpec;
  },
});
