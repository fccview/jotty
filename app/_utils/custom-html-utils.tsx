import { Mark, mergeAttributes } from "@tiptap/core";
import TurndownService from "turndown";

export interface CustomHtmlMarkDefinition {
  name: string;
  tag: string;
  classes?: string;
  attributesToPreserve?: string[];
}

export const customHtmlMarks: CustomHtmlMarkDefinition[] = [
  {
    name: "mark",
    tag: "mark",
    classes: "bg-yellow-200 text-yellow-900 px-1 py-0.5 rounded-sm",
  },
  {
    name: "kbd",
    tag: "kbd",
    classes:
      "bg-muted px-2 py-1 text-xs rounded-md border border-border shadow-border shadow-sm",
  },
  {
    name: "subscript",
    tag: "sub",
  },
  {
    name: "superscript",
    tag: "sup",
  },
  {
    name: "abbreviation",
    tag: "abbr",
    classes: "underline decoration-dotted cursor-help",
    attributesToPreserve: ["title"],
  },
  {
    name: "fontFamily",
    tag: "span",
    classes: "",
    attributesToPreserve: ["style"],
  },
];

export const generateCustomHtmlExtensions = (): Mark[] => {
  return customHtmlMarks.map((markDef) => {
    return Mark.create({
      name: markDef.name,

      addAttributes() {
        if (markDef.name === "fontFamily") {
          return {
            style: {
              default: null,
              parseHTML: (element: HTMLElement) => {
                const fontFamily = element.style.fontFamily;
                return fontFamily ? `font-family: ${fontFamily}` : null;
              },
              renderHTML: (attributes: Record<string, any>) => {
                if (!attributes.style) return {};
                return {
                  style: attributes.style,
                };
              },
            },
          };
        }

        if (!markDef.attributesToPreserve) return {};
        const attrs: Record<string, { default: null }> = {};
        markDef.attributesToPreserve.forEach((attr) => {
          attrs[attr] = { default: null };
        });
        return attrs;
      },

      parseHTML() {
        if (markDef.name === "fontFamily") {
          return [
            {
              tag: "span[style*='font-family']",
              getAttrs: (node) => {
                if (typeof node === "string") return false;
                const fontFamily = (node as HTMLElement).style.fontFamily;
                return fontFamily ? {} : false;
              },
            },
          ];
        }

        return [
          {
            tag: markDef.tag,
            getAttrs: (node) => {
              if (typeof node === "string" || !markDef.attributesToPreserve) {
                return {};
              }
              const attrs: Record<string, string | null> = {};
              for (const attr of markDef.attributesToPreserve) {
                if (node.hasAttribute(attr)) {
                  attrs[attr] = node.getAttribute(attr);
                }
              }
              return Object.keys(attrs).length ? attrs : false;
            },
          },
        ];
      },

      renderHTML({ HTMLAttributes }) {
        return [
          markDef.tag,
          mergeAttributes(HTMLAttributes, { class: markDef.classes || "" }),
          0,
        ];
      },
    });
  });
};

export const addCustomHtmlTurndownRules = (service: TurndownService) => {
  customHtmlMarks.forEach((markDef) => {
    service.addRule(markDef.name, {
      filter: (node) => {
        if (markDef.name === "fontFamily") {
          return (
            node.nodeName.toLowerCase() === "span" &&
            (node as HTMLElement).style.fontFamily !== ""
          );
        }
        return node.nodeName.toLowerCase() === markDef.tag;
      },
      replacement: (content, node) => {
        const element = node as HTMLElement;

        if (markDef.name === "fontFamily") {
          const fontFamily = element.style.fontFamily;
          if (!fontFamily) return content;
          const normalizedFont = fontFamily.replace(/"/g, "'");
          return `<span style="font-family: ${normalizedFont}">${content}</span>`;
        }

        let attrsString = "";

        if (markDef.attributesToPreserve) {
          attrsString = markDef.attributesToPreserve
            .map((attrName) => {
              const value = element.getAttribute(attrName);
              return value ? `${attrName}="${value}"` : "";
            })
            .filter(Boolean)
            .join(" ");
        }

        const finalAttrs = attrsString ? ` ${attrsString}` : "";
        return `<${markDef.tag}${finalAttrs}>${content}</${markDef.tag}>`;
      },
    });
  });
};