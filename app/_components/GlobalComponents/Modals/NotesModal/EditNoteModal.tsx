"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { CategoryTreeSelector } from "@/app/_components/GlobalComponents/Dropdowns/CategoryTreeSelector";
import { getNoteById, updateNote } from "@/app/_server/actions/note";
import { Note, Category } from "@/app/_types";
import { ARCHIVED_DIR_NAME } from "@/app/_consts/files";
import { buildCategoryPath } from "@/app/_utils/global-utils";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { parseNoteContent } from "@/app/_utils/client-parser-utils";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { useTranslations } from "next-intl";

interface EditNoteModalProps {
  note: Note;
  categories: Category[];
  onClose: () => void;
  onUpdated: () => void;
  unarchive?: boolean;
}

export const EditNoteModal = ({
  note: initialNote,
  categories,
  onClose,
  onUpdated,
  unarchive,
}: EditNoteModalProps) => {
  const t = useTranslations();
  const { user } = useAppMode();
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [title, setTitle] = useState(initialNote.title);
  const initialCategory = unarchive ? "" : initialNote.category || "";
  const [category, setCategory] = useState(initialCategory);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchNote = async () => {
      const note = await getNoteById(
        initialNote.id,
        initialNote.category || "Uncategorized",
        user?.username || ""
      );
      const parsedNote = parseNoteContent(
        note?.rawContent || "",
        note?.id || ""
      );

      setNote(note || null);
      setTitle(parsedNote?.title || "");
      setIsOwner(user?.username === note?.owner);
    };
    fetchNote();
  }, [initialNote]);

  if (!note) {
    return (
      <Modal isOpen={true} onClose={onClose} title="Note not found">
        <p>Note not found</p>
      </Modal>
    );
  }

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
    } else if (unarchive) {
      formData.append("category", category || "Uncategorized");
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
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className={unarchive ? "hidden" : ""}>
          <Input
            id="noteName"
            name="noteName"
            label="Note Name *"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter note name..."
            required
            disabled={isLoading}
          />
        </div>

        {unarchive && (
          <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
        )}

        {isOwner && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t('notes.category')}</label>
            <CategoryTreeSelector
              categories={categories}
              selectedCategory={
                category !== ARCHIVED_DIR_NAME ? category : "Uncategorized"
              }
              onCategorySelect={setCategory}
              placeholder={t('common.selectCategory')}
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
          >{t('common.cancel')}</Button>
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
