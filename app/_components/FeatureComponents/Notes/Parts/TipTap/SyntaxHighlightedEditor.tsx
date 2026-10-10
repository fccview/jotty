"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  showVisualGuides?: boolean;
  visualGuideColumns?: number[];
}

interface CodeEditorHandle {
  session: { history: MarkdownUtils.MarkdownHistory };
}

const LINE_HEIGHT = 21;
const PHYSICAL_KEY = /^(Key|Digit)(.)$/;

const shortcutKey = (e: React.KeyboardEvent) => {
  const physical = e.metaKey && e.altKey ? e.code.match(PHYSICAL_KEY) : null;
  return (physical ? physical[2] : e.key).toLowerCase();
};

export const SyntaxHighlightedEditor = ({
  content,
  onChange,
  onFileDrop,
  showLineNumbers = true,
  onLinkRequest,
  onCodeBlockRequest,
  showVisualGuides = false,
  visualGuideColumns = [],
}: SyntaxHighlightedEditorProps) => {
  const { user } = useAppMode();
  const editorRef = useRef<HTMLDivElement>(null);
  const codeEditorRef = useRef<CodeEditorHandle>(null);
  const charWidthRef = useRef(0);
  const [editorWidth, setEditorWidth] = useState(0);

  usePrismTheme(user?.markdownTheme || "prism");

  useEffect(
    () => MarkdownUtils.bindMarkdownHistory(() => codeEditorRef.current?.session.history ?? null),
    []
  );

  useLayoutEffect(() => {
    MarkdownUtils.applyPendingCaret();
  }, [content]);

  useEffect(() => {
    const el = document.createElement("span");
    el.className = "markdown-line-measure";
    el.textContent = "x".repeat(100);
    document.body.append(el);
    charWidthRef.current = el.offsetWidth / 100;
    el.remove();

    const updateWidth = () => {
      const pre = editorRef.current?.querySelector("pre");
      if (pre) setEditorWidth(pre.clientWidth - 32);
    };
    updateWidth();
    const obs = new ResizeObserver(updateWidth);
    if (editorRef.current) obs.observe(editorRef.current);
    return () => obs.disconnect();
  }, []);

  const calcHeight = (line: string) => {
    if (!editorWidth || !line || !charWidthRef.current) return LINE_HEIGHT;
    return Math.max(1, Math.ceil((line.length * charWidthRef.current) / editorWidth)) * LINE_HEIGHT;
  };

  const applyEdit = (
    e: React.KeyboardEvent<HTMLTextAreaElement | HTMLDivElement>,
    newContent: string | null
  ) => {
    if (newContent === null) return;
    e.preventDefault();
    onChange(newContent);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement | HTMLDivElement>
  ) => {
    const isMod = e.metaKey || e.ctrlKey;
    const textarea = MarkdownUtils.getMarkdownTextarea();
    if (!textarea) return;
    const key = shortcutKey(e);

    if (isMod && e.altKey && key === "c") {
      e.preventDefault();
      if (onCodeBlockRequest) {
        onCodeBlockRequest();
      } else {
        MarkdownUtils.runMarkdownEdit(
          (ta) => MarkdownUtils.insertCodeBlock(ta, ""),
          onChange
        );
      }
      return;
    }

    const match = FORMAT_SHORTCUTS.find(
      (s) =>
        isMod &&
        s.key.toLowerCase() === key &&
        !!s.shift === e.shiftKey &&
        !!s.alt === e.altKey
    );

    if (match) {
      e.preventDefault();
      MarkdownUtils.runMarkdownEdit(match.action, onChange);
      return;
    }

    if (isMod && e.shiftKey && !e.altKey && key === "k") {
      e.preventDefault();
      onLinkRequest?.(textarea.selectionStart !== textarea.selectionEnd);
    } else if (e.key === "Enter" && !isMod && !e.shiftKey && !e.altKey) {
      applyEdit(e, MarkdownUtils.handleListEnter(textarea));
    } else if (e.key === "Tab" && !isMod && !e.shiftKey && !e.altKey) {
      applyEdit(e, MarkdownUtils.indentListItem(textarea));
    }
  };

  const handleHighlight = (code: string) =>
    code && Prism.languages.markdown
      ? Prism.highlight(code, Prism.languages.markdown, "markdown")
      : code;

  const handlePaste = (e: React.ClipboardEvent) => {
    const textarea = MarkdownUtils.getMarkdownTextarea();
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
      className="flex-1 overflow-y-auto jotty-scrollable-content min-h-0"
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
          <div className="markdown-line-numbers py-4 px-1 text-foreground text-right select-none hidden lg:block opacity-50">
            {content.split("\n").map((line, i) => (
              <div key={i} className="leading-[21px]" style={{ height: calcHeight(line) }}>
                {i + 1}
              </div>
            ))}
          </div>
        )}
        <div className="relative flex-1">
          {showVisualGuides && charWidthRef.current > 0 && (
            <div className="absolute inset-0 pointer-events-none hidden lg:block" aria-hidden="true">
              {visualGuideColumns.map((column) => (
                <div
                  key={column}
                  className="absolute top-0 bottom-0 w-px bg-primary/30"
                  style={{ left: `${column * charWidthRef.current + 16}px` }}
                  title={`Column ${column}`}
                />
              ))}
            </div>
          )}
          <Editor
            ref={codeEditorRef}
            value={content}
            onValueChange={onChange}
            highlight={handleHighlight}
            padding={16}
            tabSize={4}
            insertSpaces={true}
            className={`${MarkdownUtils.MARKDOWN_EDITOR_CLASS} flex-1 jotty-scrollable-content`}
            style={{ minHeight: "400px" }}
            textareaId={MarkdownUtils.MARKDOWN_TEXTAREA_ID}
            textareaClassName="focus:outline-none bg-transparent"
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
          />
        </div>
      </div>
    </div>
  );
};
