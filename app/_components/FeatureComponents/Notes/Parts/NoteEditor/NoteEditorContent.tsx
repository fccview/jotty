import {
  TiptapEditor,
  TiptapEditorRef,
} from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/TipTapEditor";
import { UnifiedMarkdownRenderer } from "@/app/_components/FeatureComponents/Notes/Parts/UnifiedMarkdownRenderer";
import { ReferencedBySection } from "@/app/_components/FeatureComponents/Notes/Parts/ReferencedBySection";
import { ReadingProgressBar } from "@/app/_components/GlobalComponents/Layout/ReadingProgressBar";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useSettings } from "@/app/_utils/settings-store";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useMemo } from "react";
import { getReferences } from "@/app/_utils/indexes-utils";
import { usePermissions } from "@/app/_providers/PermissionsProvider";
import { MinimalModeEditor } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/MinimalModeEditor";
import { Key } from "lucide-react";

interface NoteEditorContentProps {
  isEditing: boolean;
  noteContent?: string;
  editorContent: string;
  onEditorContentChange: (content: string, isMarkdown: boolean) => void;
  noteId?: string;
  noteCategory?: string;
  encrypted?: boolean;
}

export const NoteEditorContent = ({
  isEditing,
  noteContent,
  editorContent,
  onEditorContentChange,
  noteId,
  noteCategory,
  encrypted,
}: NoteEditorContentProps) => {
  const { user, linkIndex, notes, checklists, appSettings } = useAppMode();
  const { compactMode } = useSettings();
  const searchParams = useSearchParams();
  const notesDefaultMode = user?.notesDefaultMode || "view";
  const editor = searchParams?.get("editor");
  const editorRef = useRef<TiptapEditorRef>(null);
  const { permissions } = usePermissions();

  const isMinimalMode = user?.disableRichEditor === "enable";

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
      (isEditing || notesDefaultMode === "edit" || editor === "true") &&
      !isMinimalMode
    ) {
      editorRef.current.updateAtMentionData(
        notes,
        checklists,
        user?.username || ""
      );
    }
  }, [
    notes,
    checklists,
    isEditing,
    notesDefaultMode,
    editor,
    editorRef,
    isMinimalMode,
  ]);

  const isEditMode =
    (notesDefaultMode === "edit" || editor === "true" || isEditing) &&
    permissions?.canEdit &&
    !encrypted;

  const isContentEncrypted = encrypted && editorContent?.includes("-----BEGIN PGP MESSAGE-----");

  if (isContentEncrypted) {
    return (
      <div className="flex-1 h-full pb-14 lg:pb-0 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto px-6">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Key className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h3 className="text-xl font-semibold">This note is encrypted</h3>
          <p className="text-sm text-muted-foreground">
            This note is protected with PGP encryption. Use the menu in the top-right corner to view or decrypt it.
          </p>
        </div>
      </div>
    );
  }

  if (isMinimalMode) {
    return (
      <div className="flex-1 h-full pb-10 lg:pb-0">
        <MinimalModeEditor
          isEditing={isEditMode ?? false}
          noteContent={encrypted ? editorContent : (noteContent || "")}
          onEditorContentChange={onEditorContentChange}
          compactMode={compactMode}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 h-full pb-14 lg:pb-0">
      {isEditMode ? (
        <TiptapEditor
          ref={editorRef}
          content={editorContent}
          onChange={onEditorContentChange}
          tableSyntax={user?.tableSyntax}
          notes={notes}
          checklists={checklists}
        />
      ) : (
        <>
          <ReadingProgressBar />
          <div
            className={`px-6 pt-6 pb-12 ${compactMode ? "max-w-[900px] mx-auto" : ""
              }`}
          >
            <UnifiedMarkdownRenderer content={encrypted ? editorContent : (noteContent || "")} />
            {referencingItems.length > 0 &&
              appSettings?.editor?.enableBilateralLinks && (
                <ReferencedBySection referencingItems={referencingItems} />
              )}
          </div>
        </>
      )}
    </div>
  );
};
