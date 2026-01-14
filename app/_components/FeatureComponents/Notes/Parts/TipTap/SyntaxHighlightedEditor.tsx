"use client";

import { useEffect, useState, useRef } from "react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-markdown";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import * as MarkdownUtils from "@/app/_utils/markdown-editor-utils";

interface SyntaxHighlightedEditorProps {
  content: string;
  onChange: (value: string) => void;
  onFileDrop: (files: File[]) => void;
  showLineNumbers?: boolean;
  onLinkRequest?: (hasSelection: boolean) => void;
  onCodeBlockRequest?: (language?: string) => void;
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
  onLinkRequest,
  onCodeBlockRequest,
}: SyntaxHighlightedEditorProps) => {
  const { user } = useAppMode();
  const [lineCount, setLineCount] = useState(1);
  const editorRef = useRef<HTMLDivElement>(null);
  const theme = user?.markdownTheme || "prism";
  const pendingSelectionRef = useRef<{ start: number; end: number } | null>(null);

  useEffect(() => {
    const lines = content.split("\n").length;
    setLineCount(lines);
  }, [content]);

  useEffect(() => {
    if (pendingSelectionRef.current) {
      const textarea = document.getElementById("markdown-editor-textarea") as HTMLTextAreaElement;
      if (textarea) {
        const { start, end } = pendingSelectionRef.current;
        const scrollTop = textarea.scrollTop;
        const scrollLeft = textarea.scrollLeft;
        requestAnimationFrame(() => {
          textarea.focus({ preventScroll: true });
          textarea.setSelectionRange(start, end);
          textarea.scrollTop = scrollTop;
          textarea.scrollLeft = scrollLeft;
        });
      }
      pendingSelectionRef.current = null;
    }
  }, [content]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLDivElement>) => {
    const isMod = e.metaKey || e.ctrlKey;
    const textarea = document.getElementById("markdown-editor-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const applyFormat = (fn: (ta: HTMLTextAreaElement) => string) => {
      e.preventDefault();
      const selection = { start: textarea.selectionStart, end: textarea.selectionEnd };
      const newContent = fn(textarea);
      pendingSelectionRef.current = { start: textarea.selectionStart, end: textarea.selectionEnd };
      onChange(newContent);
    };

    if (isMod && !e.shiftKey && !e.altKey && e.key === "b") {
      applyFormat(MarkdownUtils.insertBold);
    } else if (isMod && !e.shiftKey && !e.altKey && e.key === "i") {
      applyFormat(MarkdownUtils.insertItalic);
    } else if (isMod && !e.shiftKey && !e.altKey && e.key === "u") {
      applyFormat(MarkdownUtils.insertUnderline);
    } else if (isMod && e.shiftKey && !e.altKey && (e.key === "X" || e.key === "x")) {
      applyFormat(MarkdownUtils.insertStrikethrough);
    } else if (isMod && !e.shiftKey && !e.altKey && e.key === "e") {
      applyFormat(MarkdownUtils.insertInlineCode);
    } else if (isMod && e.shiftKey && !e.altKey && (e.key === "B" || e.key === "b")) {
      applyFormat(MarkdownUtils.insertBlockquote);
    } else if (isMod && e.shiftKey && !e.altKey && (e.key === "&" || e.key === "7")) {
      applyFormat(MarkdownUtils.insertOrderedList);
    } else if (isMod && e.shiftKey && !e.altKey && (e.key === "*" || e.key === "8")) {
      applyFormat(MarkdownUtils.insertBulletList);
    } else if (isMod && e.shiftKey && !e.altKey && (e.key === "(" || e.key === "9")) {
      applyFormat(MarkdownUtils.insertTaskList);
    } else if (isMod && e.shiftKey && !e.altKey && (e.key === "K" || e.key === "k")) {
      e.preventDefault();
      if (onLinkRequest) {
        const hasSelection = textarea.selectionStart !== textarea.selectionEnd;
        onLinkRequest(hasSelection);
      }
    } else if (isMod && e.altKey && !e.shiftKey && e.key === "1") {
      applyFormat((ta) => MarkdownUtils.insertHeading(ta, 1));
    } else if (isMod && e.altKey && !e.shiftKey && e.key === "2") {
      applyFormat((ta) => MarkdownUtils.insertHeading(ta, 2));
    } else if (isMod && e.altKey && !e.shiftKey && e.key === "3") {
      applyFormat((ta) => MarkdownUtils.insertHeading(ta, 3));
    } else if (isMod && e.altKey && !e.shiftKey && e.key === "4") {
      applyFormat((ta) => MarkdownUtils.insertHeading(ta, 4));
    } else if (isMod && e.altKey && !e.shiftKey && e.key === "5") {
      applyFormat((ta) => MarkdownUtils.insertHeading(ta, 5));
    } else if (isMod && e.altKey && !e.shiftKey && e.key === "6") {
      applyFormat((ta) => MarkdownUtils.insertHeading(ta, 6));
    } else if (isMod && e.altKey && !e.shiftKey && (e.key === "c" || e.key === "C")) {
      e.preventDefault();
      if (onCodeBlockRequest) {
        onCodeBlockRequest();
      } else {
        applyFormat((ta) => MarkdownUtils.insertCodeBlock(ta, ""));
      }
    } else if (isMod && e.shiftKey && !e.altKey && (e.key === "H" || e.key === "h")) {
      applyFormat(MarkdownUtils.insertHighlight);
    }
  };

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
          textareaId="markdown-editor-textarea"
          textareaClassName="focus:outline-none bg-transparent"
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  );
};