"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { createNote } from "@/app/_server/actions/note";
import { Category, Note } from "@/app/_types";
import { Modal } from "../Modal";
import { CategoryInput } from "@/app/_components/GlobalComponents/FormElements/CategoryInput";
import { Modes } from "@/app/_types/enums";
import { createCategory } from "@/app/_server/actions/category";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { useTranslations } from "next-intl";

interface CreateNoteModalProps {
  onClose: () => void;
  onCreated: (doc?: Note) => void;
  categories: Category[];
  initialCategory?: string;
}

export const CreateNoteModal = ({
  onClose,
  onCreated,
  categories,
  initialCategory = "",
}: CreateNoteModalProps) => {
  const t = useTranslations();
  const { user } = useAppMode();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [newCategory, setNewCategory] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsCreating(true);
    try {
      let finalCategoryPath = category;
      if (showNewCategory && newCategory.trim()) {
        const newCatTrimmed = newCategory.trim();
        const categoryFormData = new FormData();
        categoryFormData.append("name", newCatTrimmed);
        categoryFormData.append("mode", Modes.NOTES);
        if (category) {
          categoryFormData.append("parent", category);
        }
        await createCategory(categoryFormData);
        finalCategoryPath = category
          ? `${category}/${newCatTrimmed}`
          : newCatTrimmed;
      }

      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("category", finalCategoryPath);
      formData.append("content", "");
      const result = await createNote(formData);

      if (result.success) onCreated(result.data);
    } finally {
      setIsCreating(false);
    }
  };

  const handleShowNewCategory = (show: boolean) => {
    setShowNewCategory(show);
    if (!show) setNewCategory("");
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={t('notes.createNewNote')}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          ref={titleInputRef}
          id="title"
          name="title"
          label="Title *"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter note title..."
          required
          disabled={isCreating}
          autoFocus
        />

        <CategoryInput
          categories={categories}
          selectedCategory={category}
          onCategoryChange={setCategory}
          newCategory={newCategory}
          onNewCategoryChange={setNewCategory}
          showNewCategory={showNewCategory}
          onShowNewCategoryChange={handleShowNewCategory}
          disabled={isCreating}
        />

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isCreating}
          >{t('common.cancel')}</Button>
          <Button
            type="submit"
            disabled={!title.trim() || isCreating}
            className="flex-1"
          >
            {isCreating ? "Creating..." : "Create Note"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
