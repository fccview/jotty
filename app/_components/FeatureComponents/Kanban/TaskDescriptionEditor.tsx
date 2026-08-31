"use client";

import { useEffect, useRef } from "react";
import {
  TiptapEditor,
  TiptapEditorRef,
} from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/TipTapEditor";
import { MinimalEditorPanel } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/MinimalEditorPanel";
import { convertHtmlToMarkdownUnified } from "@/app/_utils/markdown-utils";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useMinimalMode } from "@/app/_hooks/useMinimalMode";

interface TaskDescriptionEditorProps {
  content: string;
  onContentChange: (markdownContent: string) => void;
}

export const TaskDescriptionEditor = ({
  content,
  onContentChange,
}: TaskDescriptionEditorProps) => {
  const { user, notes, checklists } = useAppMode();
  const editorRef = useRef<TiptapEditorRef>(null);
  const isMinimalMode = useMinimalMode();

  useEffect(() => {
    if (!isMinimalMode && editorRef.current) {
      editorRef.current.updateAtMentionData(
        notes,
        checklists,
        user?.username || "",
      );
    }
  }, [notes, checklists, user?.username, isMinimalMode]);

  const handleEditorContentChange = (next: string, isMarkdownMode: boolean) => {
    if (isMarkdownMode) {
      onContentChange(next);
      return;
    }
    const html = next.trim().startsWith("<") ? next : `<p>${next}</p>`;
    onContentChange(convertHtmlToMarkdownUnified(html, user?.tableSyntax));
  };

  if (isMinimalMode) {
    return (
      <MinimalEditorPanel
        isEditing
        noteContent={content}
        onEditorContentChange={(next, isMarkdown) =>
          handleEditorContentChange(next, isMarkdown)
        }
        renderWrapper={(children) => (
          <div className="h-[40vh] min-h-[200px] lg:h-[48vh]">{children}</div>
        )}
      />
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
