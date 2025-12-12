"use client";

import { useState, useCallback, useEffect } from "react";
import { Eye, EyeOff, List, ListX, FileText } from "lucide-react";
import { SyntaxHighlightedEditor } from "./SyntaxHighlightedEditor";
import { UnifiedMarkdownRenderer } from "@/app/_components/FeatureComponents/Notes/Parts/UnifiedMarkdownRenderer";
import { ReadingProgressBar } from "@/app/_components/GlobalComponents/Layout/ReadingProgressBar";
import { extractYamlMetadata } from "@/app/_utils/yaml-metadata-utils";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";

interface MinimalModeEditorProps {
  isEditing: boolean;
  noteContent: string;
  onEditorContentChange: (content: string, isMarkdown: boolean) => void;
  compactMode: boolean;
}

export const MinimalModeEditor = ({
  isEditing,
  noteContent,
  onEditorContentChange,
  compactMode,
}: MinimalModeEditorProps) => {
  const { contentWithoutMetadata } = extractYamlMetadata(noteContent);
  const [markdownContent, setMarkdownContent] = useState(
    contentWithoutMetadata
  );
  const [showPreview, setShowPreview] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  useEffect(() => {
    const { contentWithoutMetadata: newContent } =
      extractYamlMetadata(noteContent);
    setMarkdownContent(newContent);
  }, [noteContent]);

  const handleChange = useCallback(
    (newContent: string) => {
      setMarkdownContent(newContent);
      onEditorContentChange(newContent, true);
    },
    [onEditorContentChange]
  );

  const handleFileDrop = useCallback((files: File[]) => {
    console.log("File drop in minimal mode not fully supported:", files);
  }, []);

  if (!isEditing) {
    return (
      <>
        <ReadingProgressBar />
        <div
          className={`px-6 pt-6 pb-12 ${
            compactMode ? "max-w-[900px] mx-auto" : ""
          }`}
        >
          <UnifiedMarkdownRenderer content={noteContent} />
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-background border-b border-border px-4 py-2 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            Minimal Mode
          </span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            {showPreview ? "Preview" : "Raw Markdown"}
          </span>
        </div>
        <div className="hidden lg:flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            title={showLineNumbers ? "Hide line numbers" : "Show line numbers"}
            className="h-8 px-2"
          >
            {showLineNumbers ? (
              <List className="h-4 w-4" />
            ) : (
              <ListX className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            title={showPreview ? "Show editor" : "Show preview"}
            className="h-8 px-2"
          >
            {showPreview ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            <span className="ml-1 text-xs">
              {showPreview ? "Edit" : "Preview"}
            </span>
          </Button>
        </div>
      </div>

      <div className="fixed bottom-[62px] w-full left-0 lg:hidden z-40 bg-background">
        <div className="flex gap-1 p-2 border-b border-border w-full justify-center items-center">
          <Button
            variant={!showPreview ? "default" : "ghost"}
            className="w-1/2"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowPreview(false)}
            title="Markdown Editor"
          >
            <FileText className="h-4 w-4 mr-2" />
            <span>Markdown</span>
          </Button>

          <Button
            variant={showPreview ? "default" : "ghost"}
            className="w-1/2"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowPreview(true)}
            title="Preview Mode"
          >
            <Eye className="h-4 w-4 mr-2" />
            <span>Preview</span>
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {showPreview ? (
          <div
            className={`px-6 pt-6 pb-12 ${
              compactMode ? "max-w-[900px] mx-auto" : ""
            }`}
          >
            <UnifiedMarkdownRenderer content={markdownContent} />
          </div>
        ) : (
          <div className="lg:p-4 h-full">
            <SyntaxHighlightedEditor
              content={markdownContent}
              onChange={handleChange}
              onFileDrop={handleFileDrop}
              showLineNumbers={showLineNumbers}
            />
          </div>
        )}
      </div>
    </div>
  );
};
