import {
  TiptapEditor,
  TiptapEditorRef,
} from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/TipTapEditor";
import { UnifiedMarkdownRenderer } from "@/app/_components/FeatureComponents/Notes/Parts/UnifiedMarkdownRenderer";
import { ReferencedBySection } from "@/app/_components/FeatureComponents/Notes/Parts/ReferencedBySection";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useSettings } from "@/app/_utils/settings-store";
import { usePathname, useSearchParams } from "next/navigation";
import { getNotes } from "@/app/_server/actions/note";
import { getLists } from "@/app/_server/actions/checklist";
import { useEffect, useState, useRef, useMemo } from "react";
import { createItemMap } from "@/app/_utils/indexes-utils";
import { getReferencingItems, getReferences } from "@/app/_utils/indexes-utils";

interface NoteEditorContentProps {
  isEditing: boolean;
  noteContent?: string;
  editorContent: string;
  onEditorContentChange: (content: string, isMarkdown: boolean) => void;
  noteId?: string;
  noteCategory?: string;
}

export const NoteEditorContent = ({
  isEditing,
  noteContent,
  editorContent,
  onEditorContentChange,
  noteId,
  noteCategory,
}: NoteEditorContentProps) => {
  const { user, linkIndex, notes, checklists, appSettings } = useAppMode();
  const { compactMode } = useSettings();
  const searchParams = useSearchParams();
  const notesDefaultMode = user?.notesDefaultMode || "view";
  const editor = searchParams?.get("editor");
  const editorRef = useRef<TiptapEditorRef>(null);

  const referencingItems = useMemo(() => {
    return getReferences(
      linkIndex,
      noteId,
      noteCategory,
      "note",
      notes,
      checklists
    );
  }, [linkIndex, noteId, noteCategory, notes, checklists]);

  useEffect(() => {
    if (
      editorRef.current &&
      (isEditing || notesDefaultMode === "edit" || editor === "true")
    ) {
      editorRef.current.updateAtMentionData(notes, checklists);
    }
  }, [notes, checklists, isEditing, notesDefaultMode, editor, editorRef]);

  return (
    <div className="flex-1 h-full pb-14 lg:pb-0">
      {notesDefaultMode === "edit" || editor === "true" || isEditing ? (
        <TiptapEditor
          ref={editorRef}
          content={editorContent}
          onChange={onEditorContentChange}
          tableSyntax={user?.tableSyntax}
          notes={notes}
          checklists={checklists}
        />
      ) : (
        <div
          className={`px-6 pt-6 pb-12 ${
            compactMode ? "max-w-[900px] mx-auto" : ""
          }`}
        >
          <UnifiedMarkdownRenderer content={noteContent || ""} />

          {referencingItems.length > 0 &&
            appSettings?.editor?.enableBilateralLinks && (
              <ReferencedBySection referencingItems={referencingItems} />
            )}
        </div>
      )}
    </div>
  );
};
