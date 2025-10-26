"use client";

import { Note, Category } from "@/app/_types";
import { UnsavedChangesModal } from "@/app/_components/GlobalComponents/Modals/ConfirmationModals/UnsavedChangesModal";
import { useNoteEditor } from "@/app/_hooks/useNoteEditor";
import { NoteEditorHeader } from "@/app/_components/FeatureComponents/Notes/Parts/NoteEditor/NoteEditorHeader";
import { NoteEditorContent } from "@/app/_components/FeatureComponents/Notes/Parts/NoteEditor/NoteEditorContent";
import { useState } from "react";
import { TableOfContents } from "../TableOfContents";

export interface NoteEditorProps {
  note: Note;
  categories: Category[];
  viewModel: ReturnType<typeof useNoteEditor>;
  onBack: () => void;
  currentUsername?: string;
  isAdmin?: boolean;
}

export const NoteEditor = ({
  note,
  categories,
  viewModel,
  onBack,
  currentUsername,
  isAdmin = false,
}: NoteEditorProps) => {
  const isOwner = note.owner === currentUsername;
  const [showTOC, setShowTOC] = useState(false);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background h-full">
      <NoteEditorHeader
        note={note}
        categories={categories}
        isOwner={isOwner}
        isAdmin={isAdmin}
        currentUsername={currentUsername}
        onBack={onBack}
        viewModel={viewModel}
        showTOC={showTOC}
        setShowTOC={setShowTOC}
      />

      <div className="flex h-full w-full">
        <div className="flex-1 overflow-y-auto mb-[70px]">
          <NoteEditorContent
            isEditing={viewModel.isEditing}
            noteContent={note.content}
            editorContent={viewModel.editorContent}
            onEditorContentChange={viewModel.handleEditorContentChange}
          />
        </div>

        {showTOC && (
          <div className="w-64 border-l border-border">
            <TableOfContents
              content={
                viewModel.isEditing
                  ? viewModel.derivedMarkdownContent
                  : note.content || ""
              }
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
