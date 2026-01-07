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
import { LockKeyIcon, ViewIcon, SquareUnlock01Icon } from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { detectEncryptionMethod, isEncrypted } from "@/app/_utils/encryption-utils";
import { useTranslations } from "next-intl";

interface NoteEditorContentProps {
  isEditing: boolean;
  noteContent?: string;
  editorContent: string;
  onEditorContentChange: (content: string, isMarkdown: boolean) => void;
  noteId?: string;
  noteCategory?: string;
  encrypted?: boolean;
  onOpenDecryptModal?: () => void;
  onOpenViewModal?: () => void;
  isEditingEncrypted?: boolean;
}

export const NoteEditorContent = ({
  isEditing,
  noteContent,
  editorContent,
  onEditorContentChange,
  noteId,
  noteCategory,
  encrypted,
  onOpenDecryptModal,
  onOpenViewModal,
  isEditingEncrypted,
}: NoteEditorContentProps) => {
  const t = useTranslations();
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
    (!encrypted || isEditingEncrypted);

  const isContentEncrypted = isEncrypted(editorContent || "");

  if (isContentEncrypted) {
    const encryptionType = detectEncryptionMethod(editorContent || "");
    return (
      <div className="flex-1 h-full flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto px-6">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <LockKeyIcon className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h3 className="text-xl font-semibold">{t("encryption.thisNoteIsEncrypted")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("encryption.noteProtectedWith", {
              type: encryptionType === "pgp" ? t("encryption.pgp") : t("encryption.xchacha")
            })}
          </p>
          <div className="flex items-center justify-center gap-3 pt-4">
            {onOpenViewModal && (
              <Button
                variant="outline"
                onClick={onOpenViewModal}
                className="flex items-center gap-2"
              >
                <ViewIcon className="h-4 w-4" />{t('settings.view')}</Button>
            )}
            {onOpenDecryptModal && (
              <Button
                onClick={onOpenDecryptModal}
                className="flex items-center gap-2"
              >
                <SquareUnlock01Icon className="h-4 w-4" />{t('encryption.decrypt')}</Button>
            )}
          </div>
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
    <div className="flex-1 h-full">
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
