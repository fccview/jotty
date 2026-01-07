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

interface DiagramsDropdownProps {
  editor: Editor | null;
}

export const DiagramsDropdown = ({ editor }: DiagramsDropdownProps) => {
  const t = useTranslations();
  if (!editor) return null;

  const insertMermaid = () => {
    const defaultMermaid = `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Option 1]
    B -->|No| D[Option 2]
    C --> E[End]
    D --> E`;

    (editor.chain().focus() as any).setMermaid(defaultMermaid).run();
  };

  const insertDrawio = () => {
    (editor.chain().focus() as any).insertDrawIo().run();
  };

  const insertExcalidraw = () => {
    (editor.chain().focus() as any).insertExcalidraw().run();
  };

  const isMermaidActive = editor.isActive("mermaid");
  const isDrawioActive = editor.isActive("drawIo");
  const isExcalidrawActive = editor.isActive("excalidraw");

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
          onClick={insertMermaid}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded">
            <DocumentCodeIcon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-medium">{t('editor.mermaidDiagram')}</div>
            <div className="text-md lg:text-sm lg:text-xs text-muted-foreground">
              {t('editor.mermaidDescription')}
            </div>
          </div>
        </button>

        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent text-md lg:text-sm border-b border-border"
          onClick={insertDrawio}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded">
            <DrawingModeIcon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-medium">{t('editor.drawioDiagram')}</div>
            <div className="text-md lg:text-sm lg:text-xs text-muted-foreground">
              {t('editor.drawioDescription')}
            </div>
          </div>
        </button>

        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent text-sm"
          onClick={insertExcalidraw}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded">
            <PencilIcon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-medium">{t('editor.excalidrawDiagram')}</div>
            <div className="text-md lg:text-sm lg:text-xs text-muted-foreground">
              {t('editor.excalidrawDescription')}
            </div>
          </div>
        </button>
      </div>
    </ToolbarDropdown>
  );
};
