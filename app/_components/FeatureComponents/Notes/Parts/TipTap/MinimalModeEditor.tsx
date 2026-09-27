"use client";

import { useState, useCallback, useEffect } from "react";
import { ViewIcon, File02Icon } from "hugeicons-react";
import { SyntaxHighlightedEditor } from "./SyntaxHighlightedEditor";
import { UnifiedMarkdownRenderer } from "@/app/_components/FeatureComponents/Notes/Parts/UnifiedMarkdownRenderer";
import { ReadingProgressBar } from "@/app/_components/GlobalComponents/Layout/ReadingProgressBar";
import { extractYamlMetadata } from "@/app/_utils/yaml-metadata-utils";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useTranslations } from "next-intl";
import {
  QuickBarPortal,
  QuickBarSlots,
  quickBarButton,
} from "@/app/_components/FeatureComponents/Notes/Parts/NoteEditor/NoteQuickBar";
import { useNotesStore } from "@/app/_utils/notes-store";
import { VisualGuideRuler } from "./VisualGuideRuler";
import { EditorSettingsDropdown } from "./Toolbar/EditorSettingsDropdown";

interface MinimalModeEditorProps {
  isEditing: boolean;
  noteContent: string;
  onEditorContentChange: (
    content: string,
    isMarkdown: boolean,
    isDirty: boolean,
  ) => void;
  compactMode: boolean;
}

export const MinimalModeEditor = ({
  isEditing,
  noteContent,
  onEditorContentChange,
  compactMode,
}: MinimalModeEditorProps) => {
  const t = useTranslations();
  const { showLineNumbers, showRuler, showVisualGuides, visualGuideColumns } =
    useNotesStore();
  const { contentWithoutMetadata } = extractYamlMetadata(noteContent);
  const [markdownContent, setMarkdownContent] = useState(
    contentWithoutMetadata,
  );
  const [showPreview, setShowPreview] = useState(false);
  const [charWidth, setCharWidth] = useState(0);

  useEffect(() => {
    const el = document.createElement("span");
    el.className = "markdown-line-measure";
    el.textContent = "x".repeat(100);
    document.body.append(el);
    setCharWidth(el.offsetWidth / 100);
    el.remove();
  }, []);

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
    [onEditorContentChange],
  );

  const handleFileDrop = useCallback((files: File[]) => {
    console.log("File drop in minimal mode not fully supported:", files);
  }, []);

  if (!isEditing) {
    return (
      <>
        <ReadingProgressBar />
        <div
          className={`px-6 pt-6 pb-4 ${
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
      <div className="bg-background border-b border-border px-4 py-2 items-center justify-between sticky top-0 z-10 hidden lg:flex">
        <div className="flex items-center gap-2">
          <span className="text-md lg:text-sm font-medium text-foreground">
            {t("editor.minimalMode")}
          </span>
          <span className="text-md lg:text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            {showPreview ? t("editor.preview") : t("editor.rawMarkdown")}
          </span>
        </div>
        <div className="hidden lg:flex items-center gap-2">
          <EditorSettingsDropdown
            isMarkdownMode={true}
            showPreview={showPreview}
            onTogglePreview={() => setShowPreview(!showPreview)}
          />
        </div>
      </div>

      <QuickBarPortal
        slot={QuickBarSlots.MODES}
        fallbackClassName="flex lg:hidden justify-end gap-1 p-1"
      >
        <Button
          variant={showPreview ? "default" : "ghost"}
          size="icon"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setShowPreview(true)}
          title={t("editor.previewMode")}
          aria-label={t("editor.previewMode")}
          aria-pressed={showPreview}
          className={quickBarButton}
        >
          <ViewIcon className="h-5 w-5" />
        </Button>

        <Button
          variant={!showPreview ? "default" : "ghost"}
          size="icon"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setShowPreview(false)}
          title={t("editor.markdownEditor")}
          aria-label={t("editor.markdownEditor")}
          aria-pressed={!showPreview}
          className={quickBarButton}
        >
          <File02Icon className="h-5 w-5" />
        </Button>
      </QuickBarPortal>
      {!showPreview && showRuler && (
        <VisualGuideRuler
          charWidth={charWidth}
          showLineNumbers={showLineNumbers}
        />
      )}
      <div className="flex-1 overflow-y-auto jotty-scrollable-content min-h-0">
        {showPreview ? (
          <div
            className={`px-6 pt-6 pb-4 ${
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
              showVisualGuides={showRuler && showVisualGuides}
              visualGuideColumns={visualGuideColumns}
            />
          </div>
        )}
      </div>
    </div>
  );
};
