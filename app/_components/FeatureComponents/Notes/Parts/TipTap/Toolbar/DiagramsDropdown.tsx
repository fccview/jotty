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
import { insertMermaid, runMarkdownEdit } from "@/app/_utils/markdown-editor-utils";
import { DEFAULT_MERMAID_DIAGRAM } from "@/app/_consts/diagrams";

interface DiagramsDropdownProps {
  editor: Editor | null;
  isMarkdownMode?: boolean;
  onMarkdownChange?: (content: string) => void;
}

export const DiagramsMenu = ({ editor, isMarkdownMode = false, onMarkdownChange }: DiagramsDropdownProps) => {
  const t = useTranslations();
  if (!editor) return null;

  const handleInsertMermaid = () => {
    if (isMarkdownMode && onMarkdownChange) {
      runMarkdownEdit((textarea) => insertMermaid(textarea, DEFAULT_MERMAID_DIAGRAM), onMarkdownChange);
    } else {
      editor.chain().focus().setMermaid(DEFAULT_MERMAID_DIAGRAM).run();
    }
  };

  const handleInsertDrawio = () => {
    if (!isMarkdownMode) {
      editor.chain().focus().insertDrawIo().run();
    }
  };

  const handleInsertExcalidraw = () => {
    if (!isMarkdownMode) {
      editor.chain().focus().insertExcalidraw().run();
    }
  };

  return (
    <div>
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
        title={isMarkdownMode ? t("editor.diagramUnavailableInMarkdown") : ""}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded">
          <DrawingModeIcon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="font-medium">{t('editor.drawioDiagram')}</div>
          <div className="text-md lg:text-xs text-muted-foreground">
            {isMarkdownMode ? t("editor.diagramRichModeOnly") : t('editor.drawioDescription')}
          </div>
        </div>
      </button>

      <button
        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm ${isMarkdownMode ? "opacity-50 cursor-not-allowed" : "hover:bg-accent"}`}
        onClick={handleInsertExcalidraw}
        disabled={isMarkdownMode}
        title={isMarkdownMode ? t("editor.diagramUnavailableInMarkdown") : ""}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded">
          <PencilIcon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="font-medium">{t('editor.excalidrawDiagram')}</div>
          <div className="text-md lg:text-xs text-muted-foreground">
            {isMarkdownMode ? t("editor.diagramRichModeOnly") : t('editor.excalidrawDescription')}
          </div>
        </div>
      </button>
    </div>
  );
};

export const DiagramsDropdown = (props: DiagramsDropdownProps) => {
  const t = useTranslations();
  const { editor } = props;
  if (!editor) return null;

  const isMermaidActive = editor && editor.isActive("mermaid");
  const isDrawioActive = editor && editor.isActive("drawio");
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
      <DiagramsMenu {...props} />
    </ToolbarDropdown>
  );
};
