"use client";

import { useEffect, useState, useRef } from "react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-markdown";
import "prismjs/themes/prism.css";

interface SyntaxHighlightedEditorProps {
  content: string;
  onChange: (value: string) => void;
  onFileDrop: (files: File[]) => void;
  showLineNumbers?: boolean;
}

const editorFontStyle = {
  fontFamily: "Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace",
  fontSize: "14px",
  lineHeight: "21px",
};

export const SyntaxHighlightedEditor = ({
  content,
  onChange,
  onFileDrop,
  showLineNumbers = true,
}: SyntaxHighlightedEditorProps) => {
  const [lineCount, setLineCount] = useState(1);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lines = content.split("\n").length;
    setLineCount(lines);
  }, [content]);

  const handleHighlight = (code: string): string => {
    if (!code) return "";
    try {
      const grammar = Prism.languages.markdown;
      if (grammar && typeof grammar === "object") {
        return Prism.highlight(code, grammar, "markdown");
      }
    } catch (error) {
      console.warn("Syntax highlighting failed:", error);
    }
    return code;
  };

  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div
      className="flex-1 overflow-y-auto h-full"
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
          onFileDrop(files);
        }
      }}
    >
      <div className="flex min-h-full" ref={editorRef}>
        {showLineNumbers && (
          <div
            className="py-4 pr-3 text-muted-foreground text-right select-none border-r border-border hidden lg:block"
            style={{ ...editorFontStyle }}
          >
            {lineNumbers.map((num) => (
              <div key={num}>{num}</div>
            ))}
          </div>
        )}
        <style>{`
          .markdown-code-editor,
          .markdown-code-editor textarea,
          .markdown-code-editor pre,
          .markdown-code-editor pre *,
          .markdown-code-editor code {
            font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace !important;
            font-size: 14px !important;
            line-height: 21px !important;
          }
          .markdown-code-editor pre {
            background: transparent !important;
          }
        `}</style>
        <Editor
          value={content}
          onValueChange={onChange}
          highlight={handleHighlight}
          padding={16}
          tabSize={4}
          insertSpaces={true}
          className="markdown-code-editor flex-1"
          style={{
            ...editorFontStyle,
            minHeight: "400px",
          }}
          textareaClassName="focus:outline-none bg-transparent"
        />
      </div>
    </div>
  );
};
