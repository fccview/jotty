import React from "react";
import Editor from "react-simple-code-editor";
import { prism } from "@/app/_utils/prism-utils";

interface CssEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export const CssEditor = ({ value, onChange }: CssEditorProps) => {
  const highlight = (code: string) => {
    if (!code) return code;

    try {
      return prism.highlight("css", code);
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
      className="w-full bg-muted rounded-jotty border font-mono text-sm leading-relaxed"
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
