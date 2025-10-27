"use client";

import { useState } from "react";
import { createCategory } from "@/app/_server/actions/category";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { CategoryTreeSelector } from "@/app/_components/GlobalComponents/Dropdowns/CategoryTreeSelector";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Folder } from "lucide-react";
import { useToast } from "@/app/_providers/ToastProvider";
import { AppMode, Category } from "@/app/_types";
import { Modes } from "@/app/_types/enums";
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
  const [categoryName, setCategoryName] = useState("");
  const [parentCategory, setParentCategory] = useState(initialParent);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();
  const t = useTranslations();

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
    <Modal
      isOpen={true}
      onClose={onClose}
      title={t("modals.create_category")}
      titleIcon={<Folder className="h-5 w-5 text-primary" />}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            {t("modals.parent_category")}
          </label>
          <CategoryTreeSelector
            categories={categories}
            selectedCategory={parentCategory}
            onCategorySelect={setParentCategory}
            placeholder={t("modals.no_parent")}
            className="w-full"
            isInModal={true}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            {t("modals.category_name")} *
          </label>
          <input
            type="text"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder={t("modals.enter_category_name")}
            className="w-full px-4 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            required
            disabled={isLoading}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 border-border text-foreground hover:bg-muted/50"
          >
            {t("global.cancel")}
          </Button>
          <Button
            type="submit"
            disabled={isLoading || !categoryName.trim()}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isLoading ? t("modals.creating") : t("modals.create_category_button")}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
