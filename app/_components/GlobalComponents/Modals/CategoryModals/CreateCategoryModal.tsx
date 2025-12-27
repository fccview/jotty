"use client";

import { useState } from "react";
import { createCategory } from "@/app/_server/actions/category";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { CategoryTreeSelector } from "@/app/_components/GlobalComponents/Dropdowns/CategoryTreeSelector";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { useToast } from "@/app/_providers/ToastProvider";
import { AppMode, Category } from "@/app/_types";
import { ARCHIVED_DIR_NAME, EXCLUDED_DIRS } from "@/app/_consts/files";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { useTranslations } from "next-intl";

interface CreateCategoryModalProps {
  onClose: () => void;
  onCreated: (category?: { name: string; count: number }) => void;
  mode: AppMode;
  categories?: Category[];
  initialParent?: string;
}

export const CreateCategoryModal = ({
  onClose,
  onCreated,
  mode,
  categories = [],
  initialParent = "",
}: CreateCategoryModalProps) => {
  const t = useTranslations();
  const [categoryName, setCategoryName] = useState("");
  const [parentCategory, setParentCategory] = useState(initialParent);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();
  const notAllowedNames = [...EXCLUDED_DIRS, ARCHIVED_DIR_NAME];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (!categoryName.trim()) return;

    const formData = new FormData();
    formData.append("name", categoryName.trim());
    formData.append("mode", mode);
    if (parentCategory) {
      formData.append("parent", parentCategory);
    }

    const result = await createCategory(formData);

    if (result.success) {
      showToast({
        type: "success",
        title: "Category created successfully!",
      });
      onCreated({ name: categoryName.trim(), count: 0 });
      onClose();
    } else {
      showToast({
        type: "error",
        title: "Failed to create category",
        message:
          result.error || "An error occurred while creating the category.",
      });
    }
    setIsLoading(false);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={t('common.createCategoryHeader')}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            {t('common.parentCategory')}
          </label>
          <CategoryTreeSelector
            categories={categories}
            selectedCategory={parentCategory}
            onCategorySelect={setParentCategory}
            placeholder={t('common.noParent')}
            className="w-full"
            isInModal={true}
          />
        </div>

        <Input
          id="categoryName"
          name="categoryName"
          label={`${t('common.categoryName')} *`}
          type="text"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          placeholder={t('common.categoryNamePlaceholder')}
          required
          disabled={isLoading}
          autoFocus
        />

        {notAllowedNames.includes(categoryName.trim().toLowerCase()) && (
          <div className="text-xs text-destructive">
            {t('common.notAllowedName', { name: categoryName })}
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >{t('common.cancel')}</Button>
          <Button
            type="submit"
            disabled={
              isLoading ||
              !categoryName.trim() ||
              notAllowedNames.includes(categoryName.trim().toLowerCase())
            }
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isLoading ? t('common.loading') : t('common.createCategory')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
