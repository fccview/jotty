import { EditorContent, Editor } from "@tiptap/react";

interface VisualEditorProps {
  editor: Editor | null;
  onFileDrop: (files: File[]) => void;
}

export const VisualEditor = ({ editor, onFileDrop }: VisualEditorProps) => {
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
