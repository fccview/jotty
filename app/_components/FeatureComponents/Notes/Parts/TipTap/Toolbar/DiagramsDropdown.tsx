"use client";

import { Editor } from "@tiptap/react";
import { ChevronDown, Network } from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { ToolbarDropdown } from "../Toolbar/ToolbarDropdown";

interface DiagramsDropdownProps {
  editor: Editor | null;
}

export const DiagramsDropdown = ({ editor }: DiagramsDropdownProps) => {
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
      title="Diagrams"
    >
      <Network className="h-4 w-4" />
      <ChevronDown className="h-3 w-3" />
    </Button>
  );

  return (
    <ToolbarDropdown trigger={trigger} direction="right">
      <div className="min-w-[200px]">
        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent text-sm border-b border-border"
          onClick={insertMermaid}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded bg-blue-500/10 text-blue-500">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-3-3v6"
              />
            </svg>
          </div>
          <div className="flex-1">
            <div className="font-medium">Mermaid Diagram</div>
            <div className="text-xs text-muted-foreground">
              Text-based flowcharts & diagrams
            </div>
          </div>
        </button>

        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent text-sm"
          onClick={insertDrawio}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded bg-green-500/10 text-green-500">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <div className="font-medium">Draw.io Diagram</div>
            <div className="text-xs text-muted-foreground">
              Visual diagram editor
            </div>
          </div>
        </button>
      </div>
    </ToolbarDropdown>
  );
};
