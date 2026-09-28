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
import { Toggle } from "@/app/_components/GlobalComponents/FormElements/Toggle";
import { PGPEncryptionModal } from "@/app/_components/GlobalComponents/Modals/EncryptionModals/PGPEncryptionModal";
import { XChaChaEncryptionModal } from "@/app/_components/GlobalComponents/Modals/EncryptionModals/XChaChaEncryptionModal";
import { useTranslations } from "next-intl";
import { useToast } from "@/app/_providers/ToastProvider";

const ENCRYPTION_PLACEHOLDER_CONTENT = "Note placeholder";

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
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [newCategory, setNewCategory] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [encryptOnCreate, setEncryptOnCreate] = useState(false);
  const [showEncryptionModal, setShowEncryptionModal] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const encryptionMethod = user?.encryptionSettings?.method || "xchacha";

  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  const _complain = (message: string, error?: string) => {
    console.warn("Note creation refused:", error || message);
    showToast({
      type: "error",
      title: t("common.error"),
      message: error || message,
    });
  };

  const _resolveCategoryPath = async (): Promise<string | null> => {
    if (showNewCategory && newCategory.trim()) {
      const newCatTrimmed = newCategory.trim();
      const categoryFormData = new FormData();
      categoryFormData.append("name", newCatTrimmed);
      categoryFormData.append("mode", Modes.NOTES);
      if (category) {
        categoryFormData.append("parent", category);
      }
      const made = await createCategory(categoryFormData);
      if (!made.success) {
        _complain(t("notes.createCategoryFailed"), made.error);
        return null;
      }
      return category ? `${category}/${newCatTrimmed}` : newCatTrimmed;
    }
    return category;
  };

  const _finalizeCreate = async (rawContent: string, isEncrypted = false) => {
    const finalCategoryPath = await _resolveCategoryPath();
    if (finalCategoryPath === null) return;

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("category", finalCategoryPath);
    formData.append("rawContent", rawContent);
    const result = await createNote(formData);
    if (!result.success) {
      _complain(t("notes.createNoteFailed"), result.error);
      return;
    }

    const doc = result.data && isEncrypted
      ? { ...result.data, encrypted: true }
      : result.data;
    onCreated(doc);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (encryptOnCreate) {
      setShowEncryptionModal(true);
      return;
    }

    setIsCreating(true);
    try {
      await _finalizeCreate("");
    } finally {
      setIsCreating(false);
    }
  };

  const handleEncryptionSuccess = async (encryptedContent: string) => {
    setShowEncryptionModal(false);
    setIsCreating(true);
    try {
      await _finalizeCreate(encryptedContent, true);
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
          label={t('notes.noteTitle')}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('notes.enterNoteTitle')}
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

        <div className="flex items-center justify-between gap-3">
          <label htmlFor="encryptOnCreate" className="text-sm text-foreground cursor-pointer">
            {t('encryption.encryptNote')}
          </label>
          <Toggle
            id="encryptOnCreate"
            checked={encryptOnCreate}
            onCheckedChange={setEncryptOnCreate}
            disabled={isCreating}
          />
        </div>

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
            {isCreating ? t('common.creating') : t('common.create')}
          </Button>
        </div>
      </form>

      {showEncryptionModal && encryptionMethod === "pgp" && (
        <PGPEncryptionModal
          isOpen={showEncryptionModal}
          onClose={() => setShowEncryptionModal(false)}
          mode="encrypt"
          noteContent={ENCRYPTION_PLACEHOLDER_CONTENT}
          onSuccess={handleEncryptionSuccess}
        />
      )}
      {showEncryptionModal && encryptionMethod === "xchacha" && (
        <XChaChaEncryptionModal
          isOpen={showEncryptionModal}
          onClose={() => setShowEncryptionModal(false)}
          mode="encrypt"
          noteContent={ENCRYPTION_PLACEHOLDER_CONTENT}
          onSuccess={handleEncryptionSuccess}
        />
      )}
    </Modal>
  );
};
