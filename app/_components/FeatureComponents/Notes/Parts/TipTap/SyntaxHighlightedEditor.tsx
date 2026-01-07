"use client";

import { useEffect, useState, useRef } from "react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-markdown";
import { useAppMode } from "@/app/_providers/AppModeProvider";

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
  const { user } = useAppMode();
  const [lineCount, setLineCount] = useState(1);
  const editorRef = useRef<HTMLDivElement>(null);
  const theme = user?.markdownTheme || "prism";

  useEffect(() => {
    const lines = content.split("\n").length;
    setLineCount(lines);
  }, [content]);

  useEffect(() => {
    const linkId = "prism-theme-stylesheet";
    const themeNames = [
      "prism",
      "prism-dark",
      "prism-funky",
      "prism-okaidia",
      "prism-tomorrow",
      "prism-twilight",
      "prism-coy",
      "prism-solarizedlight",
    ];

    const removeAllThemeStyles = () => {
      const existingLink = document.getElementById(linkId) as HTMLLinkElement;
      if (existingLink) {
        existingLink.remove();
      }

      const allLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      allLinks.forEach((link) => {
        const href = link.getAttribute("href") || "";
        if (
          (href.includes("prismjs/themes/") || href.includes("/api/prism-theme")) &&
          themeNames.some((name) => href.includes(name) || href.includes(`theme=${name}`))
        ) {
          link.remove();
        }
      });

      const allStyles = Array.from(document.querySelectorAll('style'));
      allStyles.forEach((style) => {
        const textContent = style.textContent || "";
        if (
          themeNames.some((name) => textContent.includes(`prismjs/themes/${name}`))
        ) {
          style.remove();
        }
      });
    };

    removeAllThemeStyles();

    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.type = "text/css";
    link.setAttribute("data-prism-theme", theme);
    link.href = `/api/prism-theme?theme=${theme}`;

    document.head.appendChild(link);

    return () => {
      removeAllThemeStyles();
    };
  }, [theme]);

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
      className="flex-1 overflow-y-auto jotty-scrollable-content h-full max-h-[95vh]"
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
            className="py-4 h-full px-1 text-foreground text-right select-none hidden lg:block opacity-50"
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
          className="markdown-code-editor flex-1 jotty-scrollable-content"
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