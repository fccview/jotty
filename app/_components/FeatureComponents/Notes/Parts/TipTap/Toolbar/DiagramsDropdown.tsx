"use client";

import { Editor } from "@tiptap/react";
import {
  ArrowDown01Icon,
  DocumentCodeIcon,
  DrawingModeIcon,
  GravityIcon,
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

  const isMermaidActive = editor.isActive("mermaid");
  const isDrawioActive = editor.isActive("drawIo");

  const trigger = (
    <Button
      variant={isMermaidActive || isDrawioActive ? "secondary" : "ghost"}
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
          className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent text-sm border-b border-border"
          onClick={insertMermaid}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded">
            <DocumentCodeIcon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-medium">{t('editor.mermaidDiagram')}</div>
            <div className="text-xs text-muted-foreground">
              Text-based flowcharts & diagrams
            </div>
          </div>
        </button>

        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent text-sm"
          onClick={insertDrawio}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded">
            <DrawingModeIcon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-medium">{t('editor.drawioDiagram')}</div>
            <div className="text-xs text-muted-foreground">
              Visual diagram editor
            </div>
          </div>
        </button>
      </div>
    </ToolbarDropdown>
  );
};
