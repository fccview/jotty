import { Editor } from "@tiptap/react";

interface MarkdownEditorProps {
  content: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onFileDrop: (files: File[]) => void;
}

export const MarkdownEditor = ({
  content,
  onChange,
  onFileDrop,
}: MarkdownEditorProps) => {
  return (
    <div
      className="flex-1 p-4 overflow-y-auto h-full"
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
      <textarea
        value={content}
        onChange={onChange}
        className="w-full h-full bg-background text-foreground resize-none focus:outline-none focus:ring-none p-2"
        placeholder="Write your markdown here..."
      />
    </div>
  );
};
