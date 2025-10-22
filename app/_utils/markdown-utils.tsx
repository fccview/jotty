import TurndownService from "turndown";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import { Element } from "hast";
import { addCustomHtmlTurndownRules } from "@/app/_utils/custom-html-utils";
import { html as beautifyHtml } from "js-beautify";

const turndownPluginGfm = require("turndown-plugin-gfm");

// ========================================================================
// --- NOTE TO SELF OR I'LL GO ABSOLUTELY FUCKING INSANE NEXT TIME I DEBUG ---
// --- HTML-TO-MARKDOWN CONVERSION (Tiptap HTML -> Markdown string) ---
// ========================================================================
export const createTurndownService = () => {
  const service = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    bulletListMarker: "-",
  });

  service.addRule("taskItem", {
    filter: (node) =>
      node.nodeName === "LI" && node.getAttribute("data-type") === "taskItem",

    replacement: function (content, node) {
      const element = node as HTMLElement;
      const isChecked = element.getAttribute("data-checked") === "true";
      const prefix = isChecked ? "- [x] " : "- [ ] ";
      let markdownContent = content.trim();
      markdownContent = markdownContent.replace(/\n/g, "\n    ");
      return prefix + markdownContent + "\n";
    },
  });

  service.addRule("paragraphInLi", {
    filter: (node) => {
      if (node.nodeName !== "P") return false;
      const parent = node.parentNode;
      if (!parent) return false;
      const isElement = (n: ParentNode): n is HTMLElement => n.nodeType === 1;

      if (parent.nodeName === "LI") {
        const elementChildren = Array.from(parent.children).filter(
          (child) => child.nodeType === 1
        );
        return elementChildren.length === 1;
      }
      if (
        parent.nodeName === "DIV" &&
        parent.parentNode &&
        isElement(parent.parentNode) &&
        parent.parentNode.nodeName === "LI"
      ) {
        const li = parent.parentNode;
        if (li.getAttribute("data-type") !== "taskItem") return false;
        const elementChildren = Array.from(parent.children).filter(
          (child) => child.nodeType === 1
        );
        return elementChildren.length === 1;
      }
      return false;
    },
    replacement: function (content) {
      return content;
    },
  });

  service.use(turndownPluginGfm.gfm);

  addCustomHtmlTurndownRules(service);

  service.addRule("keepHtmlTables", {
    filter: "table",
    replacement: function (content, node) {
      const unformattedHtml = (node as HTMLElement).outerHTML;
      const formattedHtml = beautifyHtml(unformattedHtml, {
        indent_size: 2,
        unformatted: [],
      });
      return `\n\n${formattedHtml}\n\n`;
    },
  });

  service.addRule("details", {
    filter: "details",
    replacement: function (content, node) {
      const element = node as HTMLElement;
      const summaryNode = element.querySelector("summary");
      const summaryText = summaryNode ? summaryNode.textContent : "Details";
      const contentNode = element.cloneNode(true) as HTMLElement;
      const summaryToRemove = contentNode.querySelector("summary");
      if (summaryToRemove) {
        contentNode.removeChild(summaryToRemove);
      }
      const mainContent = service.turndown(contentNode.innerHTML);
      return `\n<details>\n<summary>${summaryText}</summary>\n\n${mainContent}\n\n</details>\n`;
    },
  });

  service.addRule("horizontalRule", {
    filter: (node) => {
      return node.nodeName === "HR";
    },
    replacement: (content, node) => {
      return `\n---\n`;
    },
  });

  service.addRule("fileAttachment", {
    filter: (node) => {
      return (
        node.nodeName === "P" &&
        (node as HTMLElement).hasAttribute("data-file-attachment")
      );
    },
    replacement: function (content, node) {
      const element = node as HTMLElement;
      const url = element.getAttribute("data-url");
      const fileName = element.getAttribute("data-file-name");
      const type = element.getAttribute("data-type");

      if (type === "image") {
        return `![${fileName}](${url})`;
      } else {
        return `[📎 ${fileName}](${url})`;
      }
    },
  });

  return service;
};

const hasClass = (node: Element, className: string) => {
  const classList = node.properties?.className;
  if (Array.isArray(classList)) {
    return classList.some((cn) => String(cn) === className);
  }
  if (typeof classList === "string") {
    return classList.split(" ").includes(className);
  }
  return false;
};

// ==========================================================================
// --- NOTE TO SELF OR I'LL GO ABSOLUTELY FUCKING INSANE NEXT TIME I DEBUG ---
// --- MARKDOWN-TO-HTML CONVERSION (Markdown string -> Tiptap HTML) ---
// ==========================================================================
const markdownProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(() => {
    return (tree) => {
      visit(tree, "element", (node: Element) => {
        if (node.tagName === "br") {
          node.type = "element";
          node.tagName = "p";
          node.properties = node.properties || {};
          node.children = [{ type: "text", value: "  \n" }];
        }

        if (node.tagName === "ul" && hasClass(node, "contains-task-list")) {
          node.properties = node.properties || {};
          node.properties["data-type"] = "taskList";
        }

        if (node.tagName === "li" && hasClass(node, "task-list-item")) {
          node.properties = node.properties || {};
          node.properties["data-type"] = "taskItem";
          const checkbox = node.children[0];

          if (
            checkbox?.type === "element" &&
            checkbox.tagName === "input" &&
            checkbox.properties?.type === "checkbox"
          ) {
            node.properties["data-checked"] =
              checkbox.properties.checked != null &&
              checkbox.properties.checked !== false;

            node.children.shift();

            if (
              node.children[0]?.type === "text" &&
              node.children[0].value.startsWith("\n")
            ) {
              node.children[0].value = node.children[0].value.trimStart();
            }

            const contentNodes = [...node.children];
            node.children = [
              {
                type: "element",
                tagName: "p",
                properties: {},
                children: contentNodes,
              },
            ];
          }
        }
      });
    };
  })
  .use(rehypeStringify);

export const convertMarkdownToHtml = (markdown: string): string => {
  if (!markdown || typeof markdown !== "string") return "";
  const file = markdownProcessor.processSync(markdown);
  return String(file);
};

export const convertHtmlToMarkdown = (html: string): string => {
  const turndownService = createTurndownService();
  return turndownService.turndown(html);
};

export const processMarkdownContent = (content: string): string => {
  if (!content || typeof content !== "string") return "";
  return content;
};

export const convertHtmlToMarkdownUnified = (html: string): string => {
  if (!html || typeof html !== "string") return "";
  return convertHtmlToMarkdown(html);
};

export const getMarkdownPreviewContent = (
  content: string,
  isMarkdownMode: boolean
): string => {
  if (isMarkdownMode) {
    return processMarkdownContent(content);
  } else {
    return convertHtmlToMarkdownUnified(content);
  }
};

export const sanitizeMarkdown = (markdown: string): string => {
  if (!markdown || typeof markdown !== "string") return "";

  const sanitizedHtml = convertMarkdownToHtml(markdown);
  return convertHtmlToMarkdown(sanitizedHtml);
};
