"use client";

import { useState } from "react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Modal } from "../Modal";
import { useToast } from "@/app/_providers/ToastProvider";
import { useRouter } from "next/navigation";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { useTranslations } from "next-intl";

interface RenameCategoryModalProps {
  isOpen: boolean;
  categoryPath: string;
  onClose: () => void;
  onRename: (oldPath: string, newName: string) => Promise<void>;
}

export const RenameCategoryModal = ({
  isOpen,
  categoryPath,
  onClose,
  onRename,
}: RenameCategoryModalProps) => {
  const t = useTranslations();
  const categoryName = categoryPath.split("/").pop() || categoryPath;
  const [newName, setNewName] = useState(categoryName);
  const [isRenaming, setIsRenaming] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newName === categoryName) return;

    setIsRenaming(true);
    try {
      await onRename(categoryPath, newName.trim());
      showToast({
        type: "success",
        title: t("toasts.categoryRenamedSuccessfully"),
        message: t("toasts.categoryRenamedSuccessfullyMessage", {
          categoryName,
          newName: newName.trim(),
        }),
      });
      onClose();
    } catch (error) {
      console.error("Failed to rename category:", error);
      showToast({
        type: "error",
        title: t("toasts.failedToRenameCategory"),
        message: t("toasts.failedToRenameCategoryMessage"),
      });
    } finally {
      router.refresh();
      setIsRenaming(false);
    }
  };

  const handleClose = () => {
    setNewName(categoryName);
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={t("common.renameCategory")}>
      <p className="text-sm text-muted-foreground mb-4">
        {t("common.enterNewCategoryName", { categoryName })}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="categoryName"
          name="categoryName"
          label={t("common.categoryName")}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t('common.enterCategoryName')}
          autoFocus
        />

        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isRenaming}
          >{t('common.cancel')}</Button>
          <Button
            type="submit"
            disabled={!newName.trim() || newName === categoryName || isRenaming}
          >
            {isRenaming ? t('common.renaming') : t('common.rename')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
