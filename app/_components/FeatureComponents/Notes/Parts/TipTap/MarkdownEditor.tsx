import { SyntaxHighlightedEditor } from "./SyntaxHighlightedEditor";

interface MarkdownEditorProps {
  content: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onFileDrop: (files: File[]) => void;
  showLineNumbers?: boolean;
  onLinkRequest?: (hasSelection: boolean) => void;
  onCodeBlockRequest?: (language?: string) => void;
}

export const MarkdownEditor = ({
  content,
  onChange,
  onFileDrop,
  showLineNumbers = true,
  onLinkRequest,
  onCodeBlockRequest,
}: MarkdownEditorProps) => {
  const handleValueChange = (newValue: string) => {
    const syntheticEvent = {
      target: { value: newValue },
    } as React.ChangeEvent<HTMLTextAreaElement>;
    onChange(syntheticEvent);
  };

  return (
    <div className="flex-1 lg:p-4 overflow-y-auto jotty-scrollable-content h-full">
      <SyntaxHighlightedEditor
        content={content}
        onChange={handleValueChange}
        onFileDrop={onFileDrop}
        showLineNumbers={showLineNumbers}
        onLinkRequest={onLinkRequest}
        onCodeBlockRequest={onCodeBlockRequest}
      />
    </div>
  );
};
