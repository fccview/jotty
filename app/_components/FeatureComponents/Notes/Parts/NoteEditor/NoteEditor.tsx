"use client";

import { Note, Category } from "@/app/_types";
import { UnsavedChangesModal } from "@/app/_components/GlobalComponents/Modals/ConfirmationModals/UnsavedChangesModal";
import { useNoteEditor } from "@/app/_hooks/useNoteEditor";
import { NoteEditorHeader } from "@/app/_components/FeatureComponents/Notes/Parts/NoteEditor/NoteEditorHeader";
import { NoteEditorContent } from "@/app/_components/FeatureComponents/Notes/Parts/NoteEditor/NoteEditorContent";
import { useRef } from "react";
import { TableOfContents } from "../TableOfContents";
import { useSearchParams } from "next/navigation";
import { usePermissions } from "@/app/_providers/PermissionsProvider";
import { useNotesStore } from "@/app/_utils/notes-store";
import { useAppMode } from "@/app/_providers/AppModeProvider";

export interface NoteEditorProps {
  note: Note;
  categories: Category[];
  viewModel: ReturnType<typeof useNoteEditor>;
  onBack: () => void;
  onClone?: () => void;
}

export const NoteEditor = ({
  note,
  categories,
  viewModel,
  onBack,
  onClone,
}: NoteEditorProps) => {
  const { permissions } = usePermissions();
  const isOwner = permissions?.isOwner || false;
  const { showTOC, setShowTOC } = useNotesStore();
  const decryptModalRef = useRef<(() => void) | null>(null);
  const viewModalRef = useRef<(() => void) | null>(null);
  const { user } = useAppMode();
  const searchParams = useSearchParams();
  const _isEditMode =
    viewModel.isEditing ||
    user?.notesDefaultMode === "edit" ||
    searchParams?.get("editor") === "true";

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background h-full">
      <NoteEditorHeader
        note={note}
        categories={categories}
        isOwner={isOwner}
        onBack={onBack}
        onClone={onClone}
        viewModel={viewModel}
        showTOC={showTOC}
        setShowTOC={setShowTOC}
        onOpenDecryptModal={decryptModalRef}
        onOpenViewModal={viewModalRef}
      />

      <div className="flex flex-1 w-full relative min-h-0">
        <div className="flex-1 overflow-y-auto jotty-scrollable-content min-h-0">
          <NoteEditorContent
            isEditing={viewModel.isEditing}
            noteContent={note.content}
            editorContent={viewModel.editorContent}
            onEditorContentChange={viewModel.handleEditorContentChange}
            noteId={note.uuid}
            encrypted={note.encrypted}
            onOpenDecryptModal={() => decryptModalRef.current?.()}
            onOpenViewModal={() => viewModalRef.current?.()}
            isEditingEncrypted={viewModel.isEditingEncrypted}
          />
        </div>

        {showTOC && (
          <div className="w-64 border-l border-border">
            <TableOfContents
              content={
                _isEditMode
                  ? viewModel.derivedMarkdownContent
                  : note.content || ""
              }
              isEditing={_isEditMode}
            />
          </div>
        )}
      </div>

      <UnsavedChangesModal
        isOpen={viewModel.showUnsavedChangesModal}
        onClose={() => viewModel.setShowUnsavedChangesModal(false)}
        onSave={viewModel.handleUnsavedChangesSave}
        onDiscard={viewModel.handleUnsavedChangesDiscard}
        noteTitle={note.title}
      />
    </div>
  );
};
