import { MERMAID_LANGUAGE } from "@/app/_utils/markdown/consts";
import { hasClass, isElement, isText, type HastRule } from "./types";

export const codeTextRule: HastRule = {
  element: (node) => {
    if (node.tagName !== "pre") return;
    const code = node.children[0];
    if (!isElement(code, "code")) return;
    const last = code.children[code.children.length - 1];
    if (isText(last)) last.value = last.value.replace(/\n$/, "");
  },
};

export const mermaidRule: HastRule = {
  element: (node) => {
    if (node.tagName !== "pre") return;
    const code = node.children[0];
    if (!isElement(code, "code") || !hasClass(code, `language-${MERMAID_LANGUAGE}`)) return;
    const content = code.children.map((child) => (isText(child) ? child.value : "")).join("");
    node.tagName = "div";
    node.properties = {
      "data-mermaid": "",
      "data-mermaid-content": content.replace(/\n$/, ""),
    };
    node.children = [{ type: "text", value: "[Mermaid Diagram]" }];
  },
};
