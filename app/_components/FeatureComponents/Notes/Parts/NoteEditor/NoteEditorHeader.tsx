import { ShareModal } from "@/app/_components/GlobalComponents/Modals/SharingModals/ShareModal";
import { CategoryTreeSelector } from "@/app/_components/GlobalComponents/Dropdowns/CategoryTreeSelector";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { ArrowLeft } from "lucide-react";
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
} from "lucide-react";
import { Note, Category } from "@/app/_types";
import { NoteEditorViewModel } from "@/app/_types";
import { useSharing } from "@/app/_hooks/useSharing";
import { exportToPDF } from "@/app/_utils/pdf-export";
import { useState } from "react";

interface NoteEditorHeaderProps {
  note: Note;
  categories: Category[];
  isOwner: boolean;
  isAdmin: boolean;
  currentUsername?: string;
  onBack: () => void;
  showTOC: boolean;
  setShowTOC: (show: boolean) => void;
  viewModel: NoteEditorViewModel;
}

export const NoteEditorHeader = ({
  note,
  categories,
  isOwner,
  isAdmin,
  currentUsername,
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
    setIsEditing,
    status,
    handleEdit,
    handleCancel,
    handleSave,
    handleDelete,
  } = viewModel;
  const [showShareModal, setShowShareModal] = useState(false);
  const { sharingStatus } = useSharing({
    itemId: note.id,
    itemType: "note",
    itemOwner: note.owner || "",
    itemTitle: note.title,
    itemCategory: note.category,
    isOpen: showShareModal,
    onClose: () => setShowShareModal(false),
    enabled: true,
  });

  const handleExportPDF = () => {
    const element = document.querySelector(".prose");
    if (element) exportToPDF(element as HTMLElement, note.title);
  };

  const canDelete = note.isShared
    ? isAdmin || currentUsername === note.owner
    : true;

  return (
    <>
      <div className="bg-background border-b border-border px-4 py-3 sticky top-0 z-20">
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
                    {sharingStatus?.isPubliclyShared && (
                      <Globe className="h-4 w-4 text-primary" />
                    )}
                    {sharingStatus?.isShared &&
                      !sharingStatus.isPubliclyShared && (
                        <Users className="h-4 w-4 text-primary" />
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
                    setIsEditing(false);
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
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowShareModal(true)}
                  title="Share"
                >
                  <Share2 className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleExportPDF}
                  title="Export as PDF"
                >
                  <Download className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowTOC(!showTOC)}
                  className="hidden lg:flex"
                  title="Table of Contents"
                >
                  <List className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleEdit}
                  title="Edit"
                >
                  <Edit3 className="h-5 w-5" />
                </Button>
                {canDelete && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleDelete}
                    className="text-destructive hover:text-destructive"
                    title="Delete"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {showShareModal && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
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
