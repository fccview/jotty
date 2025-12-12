import { SyntaxHighlightedEditor } from "./SyntaxHighlightedEditor";

interface MarkdownEditorProps {
  content: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onFileDrop: (files: File[]) => void;
  showLineNumbers?: boolean;
}

export const MarkdownEditor = ({
  content,
  onChange,
  onFileDrop,
  showLineNumbers = true,
}: MarkdownEditorProps) => {
  const handleValueChange = (newValue: string) => {
    const syntheticEvent = {
      target: { value: newValue },
    } as React.ChangeEvent<HTMLTextAreaElement>;
    onChange(syntheticEvent);
  };

  return (
    <div className="flex-1 p-4 overflow-y-auto h-full">
      <SyntaxHighlightedEditor
        content={content}
        onChange={handleValueChange}
        onFileDrop={onFileDrop}
        showLineNumbers={showLineNumbers}
      />
    </div>
  );
};
