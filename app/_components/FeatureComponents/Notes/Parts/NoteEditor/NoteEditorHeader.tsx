"use client";

import { ShareModal } from "@/app/_components/GlobalComponents/Modals/SharingModals/ShareModal";
import { CategoryTreeSelector } from "@/app/_components/GlobalComponents/Dropdowns/CategoryTreeSelector";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Archive, ArrowLeft } from "lucide-react";
import {
  Globe,
  Users,
  FolderOpen,
  Loader2,
  Save,
  Share2,
  Download,
  List,
  Edit3,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { Note, Category } from "@/app/_types";
import { NoteEditorViewModel } from "@/app/_types";
import { useEffect, useState } from "react";
import { DropdownMenu } from "@/app/_components/GlobalComponents/Dropdowns/DropdownMenu";
import { useRouter } from "next/navigation";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { toggleArchive } from "@/app/_server/actions/users";
import { Modes } from "@/app/_types/enums";
import { encodeCategoryPath } from "@/app/_utils/global-utils";
import { sharingInfo } from "@/app/_utils/sharing-utils";
import { usePermissions } from "@/app/_providers/PermissionsProvider";

interface NoteEditorHeaderProps {
  note: Note;
  categories: Category[];
  isOwner: boolean;
  onBack: () => void;
  showTOC: boolean;
  setShowTOC: (show: boolean) => void;
  viewModel: NoteEditorViewModel;
}

export const NoteEditorHeader = ({
  note,
  categories,
  isOwner,
  onBack,
  viewModel,
  showTOC,
  setShowTOC,
}: NoteEditorHeaderProps) => {
  const {
    title,
    setTitle,
    category,
    isEditing,
    status,
    handleEdit,
    handleCancel,
    handleSave,
    handleDelete,
    setIsEditing,
    isPrinting,
  } = viewModel;
  const [showShareModal, setShowShareModal] = useState(false);
  const { user } = useAppMode();
  const router = useRouter();
  const { permissions } = usePermissions();

  const handleArchive = async () => {
    const result = await toggleArchive(note, Modes.NOTES);
    if (result.success) {
      router.refresh();
    }
  };

  const { globalSharing } = useAppMode();
  const encodedCategory = encodeCategoryPath(note.category || "Uncategorized");
  const itemDetails = sharingInfo(globalSharing, note.id, encodedCategory);
  const isShared = itemDetails.exists && itemDetails.sharedWith.length > 0;
  const sharedWith = itemDetails.sharedWith;
  const isPubliclyShared = itemDetails.isPublic;

  const canDelete = permissions?.canDelete;

  return (
    <>
      <div className="bg-background border-b border-border px-4 py-3 sticky top-0 z-20 no-print">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0 focus-within:min-w-[90%] lg:focus-within:min-w-[20%] transition-all duration-100">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-8 w-8 flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-xl font-bold bg-transparent border-none p-0 w-full focus:ring-0"
                  placeholder="Note title..."
                />
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold truncate">{title}</h1>
                    {isPubliclyShared && (
                      <span title="Publicly shared">
                        <Globe className="h-4 w-4 text-primary" />
                      </span>
                    )}
                    {isShared && (
                      <span title={sharedWith.join(", ")}>
                        <Users className="h-4 w-4 text-primary" />
                      </span>
                    )}
                  </div>
                  {category && category !== "Uncategorized" && (
                    <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                      <FolderOpen className="h-3 w-3" />
                      <span>{category}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isEditing ? (
              <>
                {isOwner && (
                  <div className="lg:w-[400px]">
                    <CategoryTreeSelector
                      categories={categories}
                      selectedCategory={category}
                      onCategorySelect={viewModel.setCategory}
                    />
                  </div>
                )}

                <Button variant="outline" size="sm" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    handleSave();
                  }}
                  className="fixed bottom-[150px] right-4 rounded-full py-6 lg:py-0 lg:rounded-md lg:relative lg:bottom-auto lg:right-auto z-10"
                  disabled={status.isSaving || status.isAutoSaving}
                >
                  {status.isSaving ? (
                    <>
                      <Loader2 className="h-6 w-6 lg:h-4 lg:w-4 mr-0 lg:mr-2 animate-spin" />
                      <span className="hidden lg:inline">Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-6 w-6 lg:h-4 lg:w-4 mr-0 lg:mr-2" />
                      <span className="hidden lg:inline">Save</span>
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  {user?.notesDefaultMode === "edit" &&
                    permissions?.canEdit && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleSave()}
                        title="Quick Save"
                        className="text-primary hover:text-primary/80"
                      >
                        {status.isSaving ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                          </>
                        ) : (
                          <>
                            <Save className="h-5 w-5" />
                          </>
                        )}
                      </Button>
                    )}

                  {permissions?.canEdit && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleEdit}
                      title="Edit"
                    >
                      <Edit3 className="h-5 w-5" />
                    </Button>
                  )}
                  <DropdownMenu
                    align="right"
                    trigger={
                      <Button variant="outline" size="icon">
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    }
                    items={[
                      ...(permissions?.isOwner
                        ? [
                            {
                              type: "item" as const,
                              label: "Share",
                              icon: <Share2 className="h-4 w-4" />,
                              onClick: () => setShowShareModal(true),
                            },
                          ]
                        : []),
                      {
                        type: "item" as const,
                        label: "Print / Save as PDF",
                        icon: isPrinting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        ),
                        onClick: viewModel.handlePrint,
                      },
                      {
                        type: "item" as const,
                        label: "Table of Contents",
                        icon: <List className="h-4 w-4" />,
                        onClick: () => setShowTOC(!showTOC),
                        className: "hidden lg:flex",
                      },
                      ...(permissions?.canDelete
                        ? [
                            {
                              type: "item" as const,
                              label: "Archive",
                              icon: <Archive className="h-4 w-4" />,
                              onClick: handleArchive,
                            },
                          ]
                        : []),
                      ...(canDelete
                        ? [
                            {
                              type: "item" as const,
                              label: "Delete",
                              icon: <Trash2 className="h-4 w-4" />,
                              onClick: handleDelete,
                              variant: "destructive" as const,
                            },
                          ]
                        : []),
                    ]}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {showShareModal && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            router.refresh();
          }}
          itemId={note.id}
          itemTitle={note.title}
          itemType="note"
          itemCategory={note.category}
          itemOwner={note.owner || ""}
        />
      )}
    </>
  );
};
