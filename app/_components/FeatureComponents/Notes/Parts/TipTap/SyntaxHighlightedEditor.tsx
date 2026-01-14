"use client";

import { useEffect, useState, useRef } from "react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-markdown";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import * as MarkdownUtils from "@/app/_utils/markdown-editor-utils";
import { usePrismTheme } from "@/app/_hooks/usePrismThemes";
import { FORMAT_SHORTCUTS } from "@/app/_consts/markdown-editor-config";

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
  const pendingSelectionRef = useRef<{ start: number; end: number } | null>(
    null
  );

  usePrismTheme(user?.markdownTheme || "prism");

  useEffect(() => {
    setLineCount(content.split("\n").length);
  }, [content]);

  useEffect(() => {
    if (pendingSelectionRef.current) {
      const textarea = document.getElementById(
        "markdown-editor-textarea"
      ) as HTMLTextAreaElement;
      if (textarea) {
        const { start, end } = pendingSelectionRef.current;
        const { scrollTop, scrollLeft } = textarea;

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

  const executeFormat = (
    textarea: HTMLTextAreaElement,
    fn: (ta: HTMLTextAreaElement) => string
  ) => {
    const newContent = fn(textarea);
    pendingSelectionRef.current = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    };
    onChange(newContent);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement | HTMLDivElement>
  ) => {
    const isMod = e.metaKey || e.ctrlKey;
    const textarea = document.getElementById(
      "markdown-editor-textarea"
    ) as HTMLTextAreaElement;
    if (!textarea) return;

    if (isMod && e.altKey && (e.key === "c" || e.key === "C")) {
      e.preventDefault();
      if (onCodeBlockRequest) {
        onCodeBlockRequest();
      } else {
        executeFormat(textarea, (ta) => MarkdownUtils.insertCodeBlock(ta, ""));
      }
      return;
    }

    const match = FORMAT_SHORTCUTS.find(
      (s) =>
        isMod &&
        s.key === e.key &&
        !!s.shift === e.shiftKey &&
        !!s.alt === e.altKey
    );

    if (match) {
      e.preventDefault();
      executeFormat(textarea, match.action);
      return;
    }

    if (isMod && e.shiftKey && !e.altKey && (e.key === "K" || e.key === "k")) {
      e.preventDefault();
      onLinkRequest?.(textarea.selectionStart !== textarea.selectionEnd);
    } else if (e.key === "Enter" && !isMod && !e.shiftKey && !e.altKey) {
      const newContent = MarkdownUtils.handleBulletListEnter(textarea);
      if (newContent !== null) {
        e.preventDefault();
        const { scrollTop, scrollLeft, selectionStart, selectionEnd } =
          textarea;
        onChange(newContent);

        requestAnimationFrame(() => {
          const ta = document.getElementById(
            "markdown-editor-textarea"
          ) as HTMLTextAreaElement;
          if (ta) {
            ta.focus({ preventScroll: true });
            ta.setSelectionRange(selectionStart, selectionEnd);
            ta.scrollTop = scrollTop;
            ta.scrollLeft = scrollLeft;
          }
        });
      }
    }
  };

  const handleHighlight = (code: string) =>
    code && Prism.languages.markdown
      ? Prism.highlight(code, Prism.languages.markdown, "markdown")
      : code;

  const handlePaste = (e: React.ClipboardEvent) => {
    const textarea = document.getElementById(
      "markdown-editor-textarea"
    ) as HTMLTextAreaElement;
    if (!textarea) return;
    const pastedText = e.clipboardData.getData("text/plain");
    const newContent = MarkdownUtils.autolinkPastedContent(
      textarea,
      pastedText
    );
    if (newContent !== null) {
      e.preventDefault();
      onChange(newContent);
    }
  };

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
        if (e.dataTransfer.files.length > 0)
          onFileDrop(Array.from(e.dataTransfer.files));
      }}
    >
      <div className="flex min-h-full" ref={editorRef}>
        {showLineNumbers && (
          <div
            className="py-4 h-full px-1 text-foreground text-right select-none hidden lg:block opacity-50"
            style={editorFontStyle}
          >
            {Array.from({ length: lineCount }, (_, i) => i + 1).map((num) => (
              <div key={num}>{num}</div>
            ))}
          </div>
        )}
        <style>{`
          .markdown-code-editor, .markdown-code-editor * {
            font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace !important;
            font-size: 14px !important;
            line-height: 21px !important;
          }
          .markdown-code-editor pre { background: transparent !important; }
        `}</style>
        <Editor
          value={content}
          onValueChange={onChange}
          highlight={handleHighlight}
          padding={16}
          tabSize={4}
          insertSpaces={true}
          className="markdown-code-editor flex-1 jotty-scrollable-content"
          style={{ ...editorFontStyle, minHeight: "400px" }}
          textareaId="markdown-editor-textarea"
          textareaClassName="focus:outline-none bg-transparent"
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
        />
      </div>
    </div>
  );
};
