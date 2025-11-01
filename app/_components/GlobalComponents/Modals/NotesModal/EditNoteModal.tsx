"use client";

import { useState, useEffect } from "react";
import { FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { CategoryTreeSelector } from "@/app/_components/GlobalComponents/Dropdowns/CategoryTreeSelector";
import { updateNote } from "@/app/_server/actions/note";
import { Note, Category } from "@/app/_types";
import { getCurrentUser } from "@/app/_server/actions/users";
import { ARCHIVED_DIR_NAME } from "@/app/_consts/files";
import { buildCategoryPath } from "@/app/_utils/global-utils";

interface EditNoteModalProps {
  note: Note;
  categories: Category[];
  onClose: () => void;
  onUpdated: () => void;
  unarchive?: boolean;
}

export const EditNoteModal = ({
  note,
  categories,
  onClose,
  onUpdated,
  unarchive,
}: EditNoteModalProps) => {
  const router = useRouter();
  const [title, setTitle] = useState(note.title);
  const initialCategory = unarchive ? "" : note.category || "";
  const [category, setCategory] = useState(initialCategory);
  const [isLoading, setIsLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const checkOwnership = async () => {
      try {
        const user = await getCurrentUser();
        setIsOwner(user?.username === note.owner);
      } catch (error) {
        console.error("Error checking ownership:", error);
      }
    };
    checkOwnership();
  }, [note.owner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append("id", note.id);
    formData.append("title", title.trim());
    formData.append("content", note.content);
    formData.append("unarchive", unarchive ? "true" : "false");
    formData.append("user", note.owner || "");

    if (isOwner) {
      formData.append("category", category || "");
    }
    formData.append("originalCategory", note.category || "Uncategorized");

    const result = await updateNote(formData, false);

    setIsLoading(false);

    if (result.success && result.data) {
      const updatedNote = result.data;

      const categoryPath = buildCategoryPath(
        updatedNote.category || "Uncategorized",
        updatedNote.id
      );

      if (!unarchive) {
        router.push(`/note/${categoryPath}`);
      }
      onUpdated();
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={unarchive ? "Unarchive Note" : "Edit Note"}
      titleIcon={<FileText className="h-5 w-5 text-primary" />}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className={unarchive ? "hidden" : ""}>
          <label className="block text-sm font-medium text-foreground mb-2">
            Note Name *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter note name..."
            className="w-full px-4 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            required
            disabled={isLoading}
          />
        </div>

        {unarchive && (
          <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
        )}

        {isOwner && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Category
            </label>
            <CategoryTreeSelector
              categories={categories}
              selectedCategory={
                category !== ARCHIVED_DIR_NAME ? category : "Uncategorized"
              }
              onCategorySelect={setCategory}
              className="w-full"
              isInModal={true}
            />
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading || !title.trim()}
            className="flex-1"
          >
            {isLoading
              ? "Updating..."
              : unarchive
                ? "Unarchive Note"
                : "Update Note"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
