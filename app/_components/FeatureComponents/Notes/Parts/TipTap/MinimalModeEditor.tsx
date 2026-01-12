"use client";

import { useState, useCallback, useEffect } from "react";
import {
  ViewIcon,
  ViewOffSlashIcon,
  LeftToRightListBulletIcon,
  RightToLeftListTriangleIcon,
  File02Icon,
} from "hugeicons-react";
import { SyntaxHighlightedEditor } from "./SyntaxHighlightedEditor";
import { UnifiedMarkdownRenderer } from "@/app/_components/FeatureComponents/Notes/Parts/UnifiedMarkdownRenderer";
import { ReadingProgressBar } from "@/app/_components/GlobalComponents/Layout/ReadingProgressBar";
import { extractYamlMetadata } from "@/app/_utils/yaml-metadata-utils";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useTranslations } from "next-intl";
import { useAppMode } from "@/app/_providers/AppModeProvider";

interface MinimalModeEditorProps {
  isEditing: boolean;
  noteContent: string;
  onEditorContentChange: (content: string, isMarkdown: boolean, isDirty: boolean) => void;
  compactMode: boolean;
}

export const MinimalModeEditor = ({
  isEditing,
  noteContent,
  onEditorContentChange,
  compactMode,
}: MinimalModeEditorProps) => {
  const t = useTranslations();
  const { user } = useAppMode();
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
      onEditorContentChange(newContent, true, true);
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
          className={`px-6 pt-6 pb-12 ${compactMode ? "max-w-[900px] mx-auto" : ""
            }`}
        >
          <UnifiedMarkdownRenderer content={noteContent} />
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-background border-b border-border px-4 py-2 items-center justify-between sticky top-0 z-10 hidden lg:flex">
        <div className="flex items-center gap-2">
          <span className="text-md lg:text-sm font-medium text-foreground">
            {t("editor.minimalMode")}
          </span>
          <span className="text-md lg:text-sm lg:text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            {showPreview ? t("editor.preview") : t("editor.rawMarkdown")}
          </span>
        </div>
        <div className="hidden lg:flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            title={showLineNumbers ? t("editor.hideLineNumbers") : t("editor.showLineNumbers")}
            className="h-8 px-2"
          >
            {showLineNumbers ? (
              <RightToLeftListTriangleIcon className="h-4 w-4" />
            ) : (
              <LeftToRightListBulletIcon className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            title={showPreview ? t("editor.showEditor") : t("editor.showPreview")}
            className="h-8 px-2"
          >
            {showPreview ? (
              <ViewOffSlashIcon className="h-4 w-4" />
            ) : (
              <ViewIcon className="h-4 w-4" />
            )}
            <span className="ml-1 text-xs">
              {showPreview ? t("common.edit") : t("editor.preview")}
            </span>
          </Button>
        </div>
      </div>

      <div className={`fixed bottom-[130px] ${user?.handedness === "left-handed" ? "left-[2.5%]" : "right-[2.5%]"} lg:hidden z-40 flex flex-col gap-1 bg-background border border-border rounded-jotty p-1`}>
        <Button
          variant={showPreview ? "default" : "ghost"}
          size="icon"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setShowPreview(true)}
          title={t("editor.previewMode")}
          className="h-10 w-10"
        >
          <ViewIcon className="h-5 w-5" />
        </Button>

        <Button
          variant={!showPreview ? "default" : "ghost"}
          size="icon"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setShowPreview(false)}
          title={t("editor.markdownEditor")}
          className="h-10 w-10"
        >
          <File02Icon className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto jotty-scrollable-content max-h-[95vh]">
        {showPreview ? (
          <div
            className={`px-6 pt-6 pb-12 ${compactMode ? "max-w-[900px] mx-auto" : ""
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
