import React from "react";
import Editor from "react-simple-code-editor";
import { prism } from "@/app/_utils/prism-utils";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { usePrismTheme } from "@/app/_hooks/usePrismThemes";

interface CssEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
}

export const CssEditor = ({ value, onChange, language = "css" }: CssEditorProps) => {
  const { user } = useAppMode();
  usePrismTheme(user?.markdownTheme || "prism");

  const highlight = (code: string) => {
    if (!code) return code;

    try {
      return prism.highlight(language, code);
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
      className="w-full bg-muted rounded-jotty border font-mono text-md lg:text-sm leading-relaxed"
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
