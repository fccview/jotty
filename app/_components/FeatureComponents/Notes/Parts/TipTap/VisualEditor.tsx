import { EditorContent, Editor } from "@tiptap/react";
import { Node } from "@tiptap/pm/model";
import { useEffect } from "react";

interface VisualEditorProps {
  editor: Editor | null;
  onFileDrop: (files: File[]) => void;
  onTextSelection?: (hasSelection: boolean) => void;
}

export const VisualEditor = ({
  editor,
  onFileDrop,
  onTextSelection,
}: VisualEditorProps) => {
  useEffect(() => {
    if (!editor || !onTextSelection) return;

    const handleSelectionUpdate = () => {
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;

      let hasTextContent = false;
      if (hasSelection) {
        editor.state.doc.nodesBetween(from, to, (node: Node) => {
          if (node.isText && node.text && node.text.trim().length > 0) {
            hasTextContent = true;
            return false;
          }
          return true;
        });
      }

      onTextSelection(hasSelection && hasTextContent);
    };

    editor.on("selectionUpdate", handleSelectionUpdate);

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
    };
  }, [editor, onTextSelection]);
  return (
    <div
      className="flex flex-col flex-1 overflow-y-auto jotty-scrollable-content min-h-0"
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
      <EditorContent
        editor={editor}
        className="flex flex-1 flex-col w-full h-full [&>.ProseMirror]:flex-1"
      />
    </div>
  );
};
