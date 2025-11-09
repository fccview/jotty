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
import { TableSyntax } from "@/app/_types";
import { decodeCategoryPath, decodeId } from "./global-utils";

const turndownPluginGfm = require("turndown-plugin-gfm");

export const createTurndownService = (tableSyntax?: TableSyntax) => {
  const service = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    bulletListMarker: "-",
    blankReplacement: function (content, node) {
      return node.nodeName === "P" ? "\u200b" : content;
    },
  });

  service.addRule("taskItem", {
    filter: (node) =>
      node.nodeName === "LI" && node.getAttribute("data-type") === "taskItem",

    replacement: function (content, node) {
      const element = node as HTMLElement;
      const parent = element.parentElement;

      if (!parent || parent.getAttribute("data-type") !== "taskList")
        return content;

      let isChecked = false;
      const dataChecked = element.getAttribute("data-checked");

      if (dataChecked !== null) {
        isChecked = dataChecked === "true";
      } else {
        const checkbox = element.querySelector('input[type="checkbox"]');
        isChecked = checkbox ? checkbox.hasAttribute("checked") : false;
      }

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

  if (tableSyntax === "html") {
    service.addRule("table", {
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

    service.addRule("thead", {
      filter: "thead",
      replacement: function (content, node) {
        return (node as HTMLElement).outerHTML;
      },
    });

    service.addRule("tbody", {
      filter: "tbody",
      replacement: function (content, node) {
        return (node as HTMLElement).outerHTML;
      },
    });

    service.addRule("tr", {
      filter: "tr",
      replacement: function (content, node) {
        return (node as HTMLElement).outerHTML;
      },
    });

    service.addRule("th", {
      filter: "th",
      replacement: function (content, node) {
        return (node as HTMLElement).outerHTML;
      },
    });

    service.addRule("td", {
      filter: "td",
      replacement: function (content, node) {
        return (node as HTMLElement).outerHTML;
      },
    });
  } else if (tableSyntax === "markdown" || tableSyntax === undefined) {
    service.addRule("table", {
      filter: "table",
      replacement: function (content, node) {
        const table = node as HTMLElement;
        let markdown = "";
        const rows: string[][] = [];

        Array.from(table.querySelectorAll("tr")).forEach((rowNode) => {
          const row: string[] = [];
          Array.from(rowNode.querySelectorAll("th, td")).forEach((cellNode) => {
            row.push(service.turndown(cellNode.innerHTML).trim());
          });
          rows.push(row);
        });

        if (rows.length === 0) return "";

        const header = rows[0];
        const body = rows.slice(1);

        const columnWidths = header.map((h) => Math.max(h.length, 1));
        body.forEach((row) => {
          row.forEach((cell, i) => {
            columnWidths[i] = Math.max(columnWidths[i], cell.length, 1);
          });
        });

        markdown += "| ";
        markdown += header.map((h, i) => h.padEnd(columnWidths[i])).join(" | ");
        markdown += " |\n";

        markdown += "| ";
        markdown += columnWidths
          .map((w) => "-".repeat(Math.max(w, 3)))
          .join(" | ");
        markdown += " |\n";

        body.forEach((row) => {
          markdown += "| ";
          markdown += row
            .map((cell, i) => cell.padEnd(columnWidths[i]))
            .join(" | ");
          markdown += " |\n";
        });

        return `\n${markdown}\n`;
      },
    });
  }

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
      } else if (type === "video") {
        return `[🎥 ${fileName}](${url})`;
      } else {
        return `[📎 ${fileName}](${url})`;
      }
    },
  });

  service.addRule("internalLink", {
    filter: (node) => {
      return (
        node.nodeName === "SPAN" &&
        (node as HTMLElement).hasAttribute("data-internal-link")
      );
    },
    replacement: function (content, node) {
      const element = node as HTMLElement;
      const href = element.getAttribute("data-href");
      const title = element.getAttribute("data-title");

      if (href && title) {
        return `[${title}](${href})`;
      }

      return content;
    },
  });

  service.addRule("image", {
    filter: (node) => {
      return node.nodeName === "IMG";
    },
    replacement: function (content, node) {
      const element = node as HTMLElement;
      const src = element.getAttribute("src");
      const alt = element.getAttribute("alt") || "";
      const width = element.getAttribute("width");
      const height = element.getAttribute("height");

      if (!src) return "";

      if (
        (width && width !== "0" && width.trim() !== "") ||
        (height && height !== "0" && height.trim() !== "")
      ) {
        const style = [];
        if (width && width !== "0" && width.trim() !== "")
          style.push(`width: ${width}px`);
        if (height && height !== "0" && height.trim() !== "")
          style.push(`height: ${height}px`);

        return `\n<img src="${src}" alt="${alt}" style="${style.join(
          "; "
        )}" />\n`;
      }

      return `![${alt}](${src})`;
    },
  });

  service.addRule("textColor", {
    filter: (node) => {
      return (
        node.nodeName === "SPAN" &&
        (node.getAttribute("style")?.includes("color:") ?? false)
      );
    },
    replacement: function (content, node) {
      const element = node as HTMLElement;
      const style = element.getAttribute("style") || "";
      const colorMatch = style.match(/color:\s*([^;]+)/);

      if (colorMatch) {
        const color = colorMatch[1].trim();
        return `<span style="color: ${color}">${content}</span>`;
      }

      return content;
    },
  });

  service.addRule("highlight", {
    filter: (node) => {
      return (
        node.nodeName === "MARK" ||
        (node.nodeName === "SPAN" &&
          (node.getAttribute("style")?.includes("background-color:") ?? false))
      );
    },
    replacement: function (content, node) {
      const element = node as HTMLElement;
      const style = element.getAttribute("style") || "";
      const bgColorMatch = style.match(/background-color:\s*([^;]+)/);

      if (bgColorMatch) {
        const color = bgColorMatch[1].trim();
        return `<mark style="background-color: ${color}">${content}</mark>`;
      }

      return `<mark>${content}</mark>`;
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

const markdownProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(() => {
    return (tree) => {
      visit(tree, "element", (node: Element) => {
        if (node.tagName === "img" && node.properties?.style) {
          const style = node.properties.style as string;
          const widthMatch = style.match(/width:\s*(\d+)px/);
          const heightMatch = style.match(/height:\s*(\d+)px/);

          if (widthMatch) {
            node.properties.width = widthMatch[1];
          }
          if (heightMatch) {
            node.properties.height = heightMatch[1];
          }

          node.properties.style = style;
        }

        if (node.tagName === "ul" && hasClass(node, "contains-task-list")) {
          node.properties = node.properties || {};
          node.properties["data-type"] = "taskList";
        }

        if (node.tagName === "li" && hasClass(node, "task-list-item")) {
          node.properties = node.properties || {};
          node.properties["data-type"] = "taskItem";

          let checkboxIndex = 0;
          let checkbox = node.children[checkboxIndex];

          while (
            checkbox &&
            checkbox.type === "text" &&
            checkboxIndex < node.children.length
          ) {
            checkboxIndex++;
            checkbox = node.children[checkboxIndex];
          }

          let isInsideP = false;

          if (
            checkbox?.type === "element" &&
            checkbox.tagName === "p" &&
            checkbox.children?.[0]
          ) {
            isInsideP = true;
            checkbox = checkbox.children[0];
          }

          if (
            checkbox?.type === "element" &&
            checkbox.tagName === "input" &&
            checkbox.properties?.type === "checkbox"
          ) {
            node.properties["data-checked"] = String(
              checkbox.properties.checked != null &&
              checkbox.properties.checked !== false
            );

            if (isInsideP) {
              const pTag = node.children[checkboxIndex];
              if (pTag.type === "element" && pTag.tagName === "p") {
                pTag.children.shift();
                if (
                  pTag.children[0]?.type === "text" &&
                  pTag.children[0].value.startsWith("\n")
                ) {
                  pTag.children[0].value = pTag.children[0].value.trimStart();
                }
              }
            } else {
              node.children.splice(checkboxIndex, 1);

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
        }

        if (node.tagName === "span" && node.properties?.style) {
          const style = node.properties.style as string;
          const colorMatch = style.match(/color:\s*([^;]+)/);
          const bgColorMatch = style.match(/background-color:\s*([^;]+)/);

          if (colorMatch) {
            node.properties["data-color"] = colorMatch[1].trim();
          }

          if (bgColorMatch) {
            node.properties["data-highlight"] = bgColorMatch[1].trim();
          }
        }

        if (node.tagName === "mark" && node.properties?.style) {
          const style = node.properties.style as string;
          const bgColorMatch = style.match(/background-color:\s*([^;]+)/);

          if (bgColorMatch) {
            node.properties["data-highlight"] = bgColorMatch[1].trim();
          }
        }

        if (node.tagName === "a" && node.properties?.href) {
          const href = String(node.properties.href);
          if (href.startsWith("/jotty/") || href.startsWith("/note/") || href.startsWith("/checklist/")) {
            const textContent =
              node.children?.[0]?.type === "text"
                ? String(node.children[0].value)
                : "";

            let uuid = "";
            let type = "note";
            let category = "";
            let itemId = "";

            if (href.startsWith("/jotty/")) {
              uuid = href.replace("/jotty/", "");
            } else if (href.startsWith("/note/")) {
              type = "note";
              const pathParts = href.replace("/note/", "").split("/");
              itemId = decodeId(pathParts.pop() || "");
              category = decodeCategoryPath(pathParts.join("/"));
            } else if (href.startsWith("/checklist/")) {
              type = "checklist";
              const pathParts = href.replace("/checklist/", "").split("/");
              itemId = decodeId(pathParts.pop() || "");
              category = decodeCategoryPath(pathParts.join("/"));
            }

            const newChildren: any[] = [];

            newChildren.push({
              type: "element",
              tagName: "span",
              properties: { class: "title" },
              children: [{ type: "text", value: textContent }],
            });

            node.tagName = "span";
            node.properties = {
              "data-internal-link": "",
              "data-href": href,
              "data-title": textContent,
              "data-uuid": uuid,
              "data-type": type,
              "data-category": category,
              "data-item-id": itemId,
              "data-convert-to-bidirectional": "false",
            };

            node.children = newChildren;

            delete node.properties.href;
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

export const convertHtmlToMarkdown = (
  html: string,
  tableSyntax?: TableSyntax
): string => {
  const turndownService = createTurndownService(tableSyntax);
  return turndownService.turndown(html);
};

export const processMarkdownContent = (content: string): string => {
  if (!content || typeof content !== "string") return "";
  return content;
};

export const convertHtmlToMarkdownUnified = (
  html: string,
  tableSyntax?: TableSyntax
): string => {
  if (!html || typeof html !== "string") return "";
  return convertHtmlToMarkdown(html, tableSyntax);
};

export const getMarkdownPreviewContent = (
  content: string,
  isMarkdownMode: boolean,
  tableSyntax?: TableSyntax
): string => {
  if (isMarkdownMode) {
    return processMarkdownContent(content);
  } else {
    return convertHtmlToMarkdownUnified(content, tableSyntax);
  }
};

export const sanitizeMarkdown = (markdown: string): string => {
  if (!markdown || typeof markdown !== "string") return "";

  const sanitizedHtml = convertMarkdownToHtml(markdown);
  let result = convertHtmlToMarkdown(sanitizedHtml);

  result = result.replace(
    /\\+\[(📎|🎥)\s+([^\]]+?)\\+\]\\+\(([^)]+?)\\+\)/g,
    "[$1 $2]($3)"
  );
  result = result.replace(
    /\\+!\\\[([^\]]*?)\\+\]\\+\(([^)]+?)\\+\)/g,
    "![$1]($2)"
  );
  result = result.replace(/\\+\[([^\]]+?)\\+\]\\+\(([^)]+?)\\+\)/g, "[$1]($2)");

  return result;
};
