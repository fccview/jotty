import { Node } from "@tiptap/core";
import { ReactNodeViewProps, ReactNodeViewRenderer } from "@tiptap/react";
import { TagLinkComponent } from "@/app/_components/FeatureComponents/Tags/TagLinkComponent";
import { DOMOutputSpec } from "@tiptap/pm/model";
import { ComponentType } from "react";

export const TagLink = Node.create({
  name: "tagLink",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      tag: {
        default: null,
      },
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
    const { tag } = node.attrs;

    return [
      "span",
      {
        "data-tag": tag,
      },
      tag,
    ] as DOMOutputSpec;
  },

  addNodeView() {
    return ReactNodeViewRenderer(
      TagLinkComponent as unknown as ComponentType<
        ReactNodeViewProps<HTMLElement>
      >
    );
  },
});
