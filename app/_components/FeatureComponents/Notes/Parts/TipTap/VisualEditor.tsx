import { EditorContent, Editor } from "@tiptap/react";
import { useEffect } from "react";

interface VisualEditorProps {
  editor: Editor | null;
  onFileDrop: (files: File[]) => void;
  onTextSelection?: (hasSelection: boolean) => void;
}

export const VisualEditor = ({ editor, onFileDrop, onTextSelection }: VisualEditorProps) => {
  useEffect(() => {
    if (!editor || !onTextSelection) return;

    const handleSelectionUpdate = () => {
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;
      onTextSelection(hasSelection);
    };

    editor.on("selectionUpdate", handleSelectionUpdate);

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
    };
  }, [editor, onTextSelection]);
  return (
    <div
      className="flex-1 overflow-y-auto"
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
      <EditorContent editor={editor} className="w-full h-full" />
    </div>
  );
};
