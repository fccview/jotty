import TurndownService from "turndown";
import { marked } from "marked";
const turndownPluginGfm = require("turndown-plugin-gfm");
import {
  FileCode,
  Terminal,
  Database,
  Globe,
  Cpu,
  Code,
  FileText,
} from "lucide-react";

export const createTurndownService = () => {
  const service = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    bulletListMarker: "-",
    br: "\n",
  });

  service.use(turndownPluginGfm.gfm);

  const originalTurndown = service.turndown;
  service.turndown = function (html) {
    return originalTurndown.call(this, html);
  };

  service.addRule("fileAttachment", {
    filter: (node) => {
      if (
        node.nodeName === "P" &&
        (node as HTMLElement).hasAttribute("data-file-attachment")
      ) {
      }
      return (
        node.nodeName === "P" &&
        (node as HTMLElement).hasAttribute("data-file-attachment")
      );
    },
    replacement: (content, node) => {
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

export const configureMarked = () => {
  marked.setOptions({
    breaks: true,
    gfm: true,
  });
};

export const parseMarkdownToHtml = (markdown: string): string => {
  configureMarked();
  return marked.parse(markdown) as string;
};

export const convertHtmlToMarkdown = (html: string): string => {
  const turndownService = createTurndownService();
  return turndownService.turndown(html);
};

export const processMarkdownContent = (content: string): string => {
  if (!content || typeof content !== "string") return "";
  return content.trim();
};

export const convertMarkdownToHtml = (markdown: string): string => {
  const processedMarkdown = processMarkdownContent(markdown);
  return parseMarkdownToHtml(processedMarkdown);
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

export const languageIcons: Record<string, JSX.Element> = {
  javascript: <FileCode className="h-4 w-4" />,
  typescript: <FileCode className="h-4 w-4" />,
  jsx: <FileCode className="h-4 w-4" />,
  tsx: <FileCode className="h-4 w-4" />,
  bash: <Terminal className="h-4 w-4" />,
  sh: <Terminal className="h-4 w-4" />,
  shell: <Terminal className="h-4 w-4" />,
  sql: <Database className="h-4 w-4" />,
  html: <Globe className="h-4 w-4" />,
  css: <Globe className="h-4 w-4" />,
  powershell: <FileCode className="h-4 w-4" />,
  python: <Cpu className="h-4 w-4" />,
  json: <FileText className="h-4 w-4" />,
  yaml: <FileText className="h-4 w-4" />,
  yml: <FileText className="h-4 w-4" />,
  markdown: <FileText className="h-4 w-4" />,
  md: <FileText className="h-4 w-4" />,
};

export const codeBlockLanguages = [
  {
    value: "text",
    label: "Plain Text",
    icon: <FileText className="h-4 w-4" />,
  },
  { value: "javascript", label: "JavaScript", icon: languageIcons.javascript },
  { value: "typescript", label: "TypeScript", icon: languageIcons.typescript },
  { value: "jsx", label: "JSX", icon: languageIcons.jsx },
  { value: "tsx", label: "TSX", icon: languageIcons.tsx },
  { value: "powershell", label: "Powershell", icon: languageIcons.powershell },
  { value: "python", label: "Python", icon: languageIcons.python },
  { value: "bash", label: "Bash", icon: languageIcons.bash },
  { value: "sql", label: "SQL", icon: languageIcons.sql },
  { value: "html", label: "HTML", icon: languageIcons.html },
  { value: "css", label: "CSS", icon: languageIcons.css },
  { value: "json", label: "JSON", icon: languageIcons.json },
  { value: "yaml", label: "YAML", icon: languageIcons.yaml },
  { value: "markdown", label: "Markdown", icon: languageIcons.markdown },
];

export const getLanguageFromCode = (code: string): string => {
  const firstLine = code.split("\n")[0].toLowerCase();

  if (firstLine.includes("#!/bin/bash") || firstLine.includes("#!/bin/sh"))
    return "bash";
  if (firstLine.includes("#!/usr/bin/env python")) return "python";
  if (firstLine.includes("#!/usr/bin/env node")) return "javascript";

  if (code.includes("import React") || code.includes("from React"))
    return "jsx";
  if (
    code.includes("interface ") ||
    code.includes("type ") ||
    code.includes(": string")
  )
    return "typescript";
  if (
    code.includes("SELECT ") ||
    code.includes("INSERT ") ||
    code.includes("UPDATE ")
  )
    return "sql";
  if (code.includes("<!DOCTYPE") || code.includes("<html")) return "html";
  if (
    code.includes("def ") ||
    code.includes("import ") ||
    code.includes("print(")
  )
    return "python";
  if (
    code.includes("function ") ||
    code.includes("const ") ||
    code.includes("let ")
  )
    return "javascript";
  if (code.includes("echo ") || code.includes("cd ") || code.includes("ls "))
    return "bash";

  return "text";
};

export const createCustomSyntaxTheme = () => ({
  'pre[class*="language-"]': {
    background: "rgb(var(--card))",
    color: "rgb(var(--foreground))",
  },
  'code[class*="language-"]': {
    background: "rgb(var(--card))",
    color: "rgb(var(--foreground))",
  },
  ".token.comment": {
    color: "rgb(var(--muted-foreground))",
    fontStyle: "italic",
  },
  ".token.prolog": {
    color: "rgb(var(--muted-foreground))",
  },
  ".token.doctype": {
    color: "rgb(var(--muted-foreground))",
  },
  ".token.cdata": {
    color: "rgb(var(--muted-foreground))",
  },
  ".token.punctuation": {
    color: "rgb(var(--muted-foreground))",
  },
  ".token.property": {
    color: "#e06c75",
  },
  ".token.tag": {
    color: "#e06c75",
  },
  ".token.boolean": {
    color: "#d19a66",
  },
  ".token.number": {
    color: "#d19a66",
  },
  ".token.constant": {
    color: "#d19a66",
  },
  ".token.symbol": {
    color: "#d19a66",
  },
  ".token.selector": {
    color: "#e06c75",
  },
  ".token.attr-name": {
    color: "#e06c75",
  },
  ".token.string": {
    color: "#98c379",
  },
  ".token.char": {
    color: "#98c379",
  },
  ".token.builtin": {
    color: "#61afef",
  },
  ".token.inserted": {
    color: "#98c379",
  },
  ".token.operator": {
    color: "#56b6c2",
  },
  ".token.entity": {
    color: "rgb(var(--foreground))",
  },
  ".token.url": {
    color: "#61afef",
  },
  ".token.variable": {
    color: "rgb(var(--foreground))",
  },
  ".token.atrule": {
    color: "#c678dd",
  },
  ".token.attr-value": {
    color: "#98c379",
  },
  ".token.function": {
    color: "#61afef",
  },
  ".token.class-name": {
    color: "#e5c07b",
  },
  ".token.keyword": {
    color: "#c678dd",
  },
  ".token.regex": {
    color: "#d19a66",
  },
  ".token.important": {
    color: "#e06c75",
    fontWeight: "bold",
  },
  ".token.bold": {
    fontWeight: "bold",
  },
  ".token.italic": {
    fontStyle: "italic",
  },
});
