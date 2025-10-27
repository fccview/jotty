"use client";

import { useState, useEffect } from "react";
import { FileText } from "lucide-react";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { CategoryTreeSelector } from "@/app/_components/GlobalComponents/Dropdowns/CategoryTreeSelector";
import { updateNote } from "@/app/_server/actions/note";
import { Note, Category } from "@/app/_types";
import { getCurrentUser } from "@/app/_server/actions/users";
import { useTranslations } from "next-intl";

interface EditNoteModalProps {
  note: Note;
  categories: Category[];
  onClose: () => void;
  onUpdated: () => void;
}

export const EditNoteModal = ({
  note,
  categories,
  onClose,
  onUpdated,
}: EditNoteModalProps) => {
  const [title, setTitle] = useState(note.title);
  const [category, setCategory] = useState(note.category || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const t = useTranslations();

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
    if (isOwner) {
      formData.append("category", category || "");
    }
    formData.append("originalCategory", note.category || "Uncategorized");

    const result = await updateNote(formData, false);

    setIsLoading(false);

    if (result.success) {
      onUpdated();
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={t("notes.edit_note")}
      titleIcon={<FileText className="h-5 w-5 text-primary" />}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            {t("notes.note_name")} *
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

        {isOwner && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t("global.category")}
            </label>
            <CategoryTreeSelector
              categories={categories}
              selectedCategory={category}
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
            {t("global.cancel")}
          </Button>
          <Button
            type="submit"
            disabled={isLoading || !title.trim()}
            className="flex-1"
          >
            {isLoading ? t("global.updating") : t("notes.update_note")}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
