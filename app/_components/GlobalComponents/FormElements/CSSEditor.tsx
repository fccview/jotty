import React from "react";
import Editor from "react-simple-code-editor";
import { lowlight } from "@/app/_utils/lowlight-utils";

interface CssEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export const CssEditor = ({ value, onChange }: CssEditorProps) => {
  const highlight = (code: string) => {
    if (!code) return code;

    try {
      const tree = lowlight.highlight("css", code);

      const highlightWithSpans = (node: any): string => {
        if (node.type === "text") {
          return node.value;
        }

        if (node.type === "element" && node.tagName === "span") {
          const className = node.properties?.className?.join(" ") || "";
          const content = node.children.map(highlightWithSpans).join("");
          return `<span class="${className}" style="font-family: 'JetBrainsMono', 'Fira Code', 'Monaco', 'Consolas', monospace; font-size: 14px; font-weight: normal; font-style: normal; line-height: 1.5; letter-spacing: normal;">${content}</span>`;
        }

        if (node.children) {
          return node.children.map(highlightWithSpans).join("");
        }

        return "";
      };

      return tree.children.map(highlightWithSpans).join("");
    } catch (e) {
      console.error(e);
      return code;
    }
  };

  return (
    <Editor
      value={value}
      onValueChange={onChange}
      highlight={highlight}
      padding={16}
      className="w-full bg-muted rounded-md border font-mono text-sm leading-relaxed"
      style={{
        fontFamily:
          '"JetBrainsMono", "Fira Code", "Monaco", "Consolas", monospace',
        fontSize: "14px",
        lineHeight: "1.5",
        minHeight: "200px",
      }}
      textareaClassName="focus:outline-none"
      preClassName="text-foreground"
    />
  );
};
