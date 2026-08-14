"use client";

import { useEffect, useRef } from "react";
import {
  TiptapEditor,
  TiptapEditorRef,
} from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/TipTapEditor";
import { MinimalModeEditor } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/MinimalModeEditor";
import { convertHtmlToMarkdownUnified } from "@/app/_utils/markdown-utils";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useSettings } from "@/app/_utils/settings-store";

interface TaskDescriptionEditorProps {
  /** Current description content (markdown text, already unsanitized). */
  content: string;
  /** Called with the latest markdown content whenever the editor changes. */
  onContentChange: (markdownContent: string) => void;
}

/**
 * Renders the task description editor surface, reusing the same editor
 * stack as notes (Tiptap rich editor, or the minimal-mode editor when the
 * user has disabled the rich editor). Emits markdown text via onContentChange
 * so callers can persist it in the existing checklist description format.
 */
export const TaskDescriptionEditor = ({
  content,
  onContentChange,
}: TaskDescriptionEditorProps) => {
  const { user, notes, checklists } = useAppMode();
  const { compactMode } = useSettings();
  const editorRef = useRef<TiptapEditorRef>(null);

  const isMinimalMode = user?.disableRichEditor === "enable";

  useEffect(() => {
    if (!isMinimalMode && editorRef.current) {
      editorRef.current.updateAtMentionData(
        notes,
        checklists,
        user?.username || "",
      );
    }
  }, [notes, checklists, user?.username, isMinimalMode]);

  const handleEditorContentChange = (
    next: string,
    isMarkdownMode: boolean,
  ) => {
    if (isMarkdownMode) {
      onContentChange(next);
      return;
    }
    // Visual mode emits HTML; normalise back to markdown for storage.
    const html = next.trim().startsWith("<") ? next : `<p>${next}</p>`;
    onContentChange(convertHtmlToMarkdownUnified(html, user?.tableSyntax));
  };

  if (isMinimalMode) {
    return (
      <div className="h-[40vh] min-h-[200px] lg:h-[48vh]">
        <MinimalModeEditor
          isEditing
          noteContent={content}
          onEditorContentChange={(next, isMarkdown) =>
            handleEditorContentChange(next, isMarkdown)
          }
          compactMode={compactMode}
        />
      </div>
    );
  }

  return (
    <div className="h-[40vh] min-h-[200px] lg:h-[48vh] border border-input rounded-jotty overflow-hidden">
      <TiptapEditor
        ref={editorRef}
        content={content}
        onChange={(next, isMarkdownMode) =>
          handleEditorContentChange(next, isMarkdownMode)
        }
        tableSyntax={user?.tableSyntax}
        notes={notes}
        checklists={checklists}
      />
    </div>
  );
};