import { SyntaxHighlightedEditor } from "./SyntaxHighlightedEditor";
import { useNotesStore } from "@/app/_utils/notes-store";
import { VisualGuideRuler } from "./VisualGuideRuler";
import { memo } from "react";
import { useCharWidth } from "@/app/_hooks/useCharWidth";

interface MarkdownEditorProps {
  content: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onFileDrop: (files: File[]) => void;
  onLinkRequest?: (hasSelection: boolean) => void;
  onCodeBlockRequest?: (language?: string) => void;
}

export const MarkdownEditor = memo(({
  content,
  onChange,
  onFileDrop,
  onLinkRequest,
  onCodeBlockRequest,
}: MarkdownEditorProps) => {
  const { showLineNumbers, showRuler, showVisualGuides, visualGuideColumns } = useNotesStore();
  const charWidth = useCharWidth();

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
      <div className="flex flex-col flex-1 lg:p-4 overflow-y-auto jotty-scrollable-content h-full">
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
});

MarkdownEditor.displayName = "MarkdownEditor";
