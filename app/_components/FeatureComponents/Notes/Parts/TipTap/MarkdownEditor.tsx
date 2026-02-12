import { SyntaxHighlightedEditor } from "./SyntaxHighlightedEditor";
import { useNotesStore } from "@/app/_utils/notes-store";
import { VisualGuideRuler } from "./VisualGuideRuler";
import { useEffect, useState } from "react";

interface MarkdownEditorProps {
  content: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onFileDrop: (files: File[]) => void;
  onLinkRequest?: (hasSelection: boolean) => void;
  onCodeBlockRequest?: (language?: string) => void;
}

export const MarkdownEditor = ({
  content,
  onChange,
  onFileDrop,
  onLinkRequest,
  onCodeBlockRequest,
}: MarkdownEditorProps) => {
  const { showLineNumbers, showRuler, showVisualGuides, visualGuideColumns } = useNotesStore();
  const [charWidth, setCharWidth] = useState(0);

  useEffect(() => {
    const el = document.createElement("span");
    el.className = "markdown-line-measure";
    el.textContent = "x".repeat(100);
    document.body.append(el);
    setCharWidth(el.offsetWidth / 100);
    el.remove();
  }, []);

  const handleValueChange = (newValue: string) => {
    const syntheticEvent = {
      target: { value: newValue },
    } as React.ChangeEvent<HTMLTextAreaElement>;
    onChange(syntheticEvent);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      {showRuler && (
        <VisualGuideRuler
          charWidth={charWidth}
          showLineNumbers={showLineNumbers}
        />
      )}
      <div className="flex-1 lg:p-4 overflow-y-auto jotty-scrollable-content h-full">
        <SyntaxHighlightedEditor
          content={content}
          onChange={handleValueChange}
          onFileDrop={onFileDrop}
          showLineNumbers={showLineNumbers}
          onLinkRequest={onLinkRequest}
          onCodeBlockRequest={onCodeBlockRequest}
          showVisualGuides={showRuler && showVisualGuides}
          visualGuideColumns={visualGuideColumns}
        />
      </div>
    </div>
  );
};
