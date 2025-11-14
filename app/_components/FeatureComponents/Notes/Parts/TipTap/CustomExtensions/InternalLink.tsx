import { Node } from "@tiptap/core";
import { ReactNodeViewProps, ReactNodeViewRenderer } from "@tiptap/react";
import { InternalLinkComponent } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/InternalLinkComponent";
import { DOMOutputSpec } from "@tiptap/pm/model";
import { ComponentType } from "react";

export const InternalLink = Node.create({
  name: "internalLink",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      href: {
        default: null,
      },
      title: {
        default: null,
      },
      type: {
        default: "note",
      },
      category: {
        default: null,
      },
      uuid: {
        default: null,
      },
      itemId: {
        default: null,
      },
      convertToBidirectional: {
        default: false,
      },
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
            convertToBidirectional: element.getAttribute("data-convert-to-bidirectional") === "true",
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { href, title, type, category, uuid, itemId, convertToBidirectional } = node.attrs;

    const children: DOMOutputSpec[] = [];

    children.push(["span", { class: "title" }, title]);

    if (category && category !== "Uncategorized") {
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
        "data-convert-to-bidirectional": convertToBidirectional ? "true" : "false",
        ...HTMLAttributes,
      },
      ...children,
    ];
  },

  addNodeView() {
    /**
     * @ts-ignore
     */
    return ReactNodeViewRenderer(
      InternalLinkComponent as unknown as ComponentType<
        ReactNodeViewProps<HTMLElement>
      >
    );
  },
});
