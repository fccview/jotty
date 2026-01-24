"use client";

import { Editor } from "@tiptap/react";
import {
  ArrowDown01Icon,
  DocumentCodeIcon,
  DrawingModeIcon,
  GravityIcon,
  PencilIcon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { ToolbarDropdown } from "../Toolbar/ToolbarDropdown";
import { useTranslations } from "next-intl";
import { insertMermaid } from "@/app/_utils/markdown-editor-utils";

interface DiagramsDropdownProps {
  editor: Editor | null;
  isMarkdownMode?: boolean;
  onMarkdownChange?: (content: string) => void;
}

export const DiagramsDropdown = ({ editor, isMarkdownMode = false, onMarkdownChange }: DiagramsDropdownProps) => {
  const t = useTranslations();
  if (!editor) return null;

  const handleInsertMermaid = () => {
    const defaultMermaid = `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Option 1]
    B -->|No| D[Option 2]
    C --> E[End]
    D --> E`;

    if (isMarkdownMode && onMarkdownChange) {
      const textarea = document.getElementById("markdown-editor-textarea") as HTMLTextAreaElement;
      if (textarea) {
        const newContent = insertMermaid(textarea, defaultMermaid);
        onMarkdownChange(newContent);
      }
    } else {
      (editor.chain().focus() as any).setMermaid(defaultMermaid).run();
    }
  };

  const handleInsertDrawio = () => {
    if (!isMarkdownMode) {
      (editor.chain().focus() as any).insertDrawIo().run();
    }
  };

  const handleInsertExcalidraw = () => {
    if (!isMarkdownMode) {
      (editor.chain().focus() as any).insertExcalidraw().run();
    }
  };

  const isMermaidActive = editor && editor.isActive("mermaid");
  const isDrawioActive = editor && editor.isActive("drawIo");
  const isExcalidrawActive = editor && editor.isActive("excalidraw");

  const trigger = (
    <Button
      variant={isMermaidActive || isDrawioActive || isExcalidrawActive ? "secondary" : "ghost"}
      size="sm"
      onMouseDown={(e) => e.preventDefault()}
      className="flex items-center gap-1"
      title={t('editor.diagrams')}
    >
      <GravityIcon className="h-4 w-4" />
      <ArrowDown01Icon className="h-3 w-3" />
    </Button>
  );

  return (
    <ToolbarDropdown trigger={trigger} direction="right">
      <div className="min-w-[200px]">
        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent text-md lg:text-sm border-b border-border"
          onClick={handleInsertMermaid}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded">
            <DocumentCodeIcon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-medium">{t('editor.mermaidDiagram')}</div>
            <div className="text-md lg:text-xs text-muted-foreground">
              {t('editor.mermaidDescription')}
            </div>
          </div>
        </button>

        <button
          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-md lg:text-sm border-b border-border ${isMarkdownMode ? "opacity-50 cursor-not-allowed" : "hover:bg-accent"}`}
          onClick={handleInsertDrawio}
          disabled={isMarkdownMode}
          title={isMarkdownMode ? "Not available in markdown mode" : ""}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded">
            <DrawingModeIcon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-medium">{t('editor.drawioDiagram')}</div>
            <div className="text-md lg:text-xs text-muted-foreground">
              {isMarkdownMode ? "Rich mode only" : t('editor.drawioDescription')}
            </div>
          </div>
        </button>

        <button
          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm ${isMarkdownMode ? "opacity-50 cursor-not-allowed" : "hover:bg-accent"}`}
          onClick={handleInsertExcalidraw}
          disabled={isMarkdownMode}
          title={isMarkdownMode ? "Not available in markdown mode" : ""}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded">
            <PencilIcon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-medium">{t('editor.excalidrawDiagram')}</div>
            <div className="text-md lg:text-xs text-muted-foreground">
              {isMarkdownMode ? "Rich mode only" : t('editor.excalidrawDescription')}
            </div>
          </div>
        </button>
      </div>
    </ToolbarDropdown>
  );
};
