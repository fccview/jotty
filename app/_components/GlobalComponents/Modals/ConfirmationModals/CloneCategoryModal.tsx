"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { CategoryTreeSelector } from "@/app/_components/GlobalComponents/Dropdowns/CategoryTreeSelector";
import { Category } from "@/app/_types";
import { useTranslations } from "next-intl";

interface CloneCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (category: string) => void;
  categories: Category[];
  currentCategory: string;
  itemType: "note" | "checklist";
}

export const CloneCategoryModal = ({
  isOpen,
  onClose,
  onConfirm,
  categories,
  currentCategory,
  itemType,
}: CloneCategoryModalProps) => {
  const t = useTranslations();
  const [selectedCategory, setSelectedCategory] = useState(currentCategory);

  useEffect(() => {
    if (isOpen) {
      setSelectedCategory(currentCategory);
    }
  }, [isOpen, currentCategory]);

  const handleConfirm = () => {
    onConfirm(selectedCategory);
    onClose();
  };

  const itemTypeLabel = itemType === "note" ? t("notes.title") : t("checklists.title");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("common.cloneItem", { item: itemTypeLabel })}
    >
      <div className="space-y-4">
        <p className="text-md lg:text-sm text-muted-foreground">
          {t("common.selectCategoryForClone")}
        </p>

        <div>
          <label className="block text-md lg:text-sm font-medium text-foreground mb-2">
            {t("notes.category")}
          </label>
          <CategoryTreeSelector
            categories={categories}
            selectedCategory={selectedCategory}
            onCategorySelect={setSelectedCategory}
            placeholder={t("common.selectCategory")}
            isInModal
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleConfirm}>
            {t("common.clone")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
