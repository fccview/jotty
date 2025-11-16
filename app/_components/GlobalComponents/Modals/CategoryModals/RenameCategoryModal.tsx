"use client";

import { useState } from "react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Edit3 } from "lucide-react";
import { Modal } from "../Modal";
import { useToast } from "@/app/_providers/ToastProvider";
import { useRouter } from "next/navigation";
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
  const categoryName = categoryPath.split("/").pop() || categoryPath;
  const [newName, setNewName] = useState(categoryName);
  const [isRenaming, setIsRenaming] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();
  const t = useTranslations();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newName === categoryName) return;

    setIsRenaming(true);
    try {
      await onRename(categoryPath, newName.trim());
      showToast({
        type: "success",
        title: "Category renamed successfully!",
        message: `Category "${categoryName}" renamed to "${newName.trim()}"`,
      });
      onClose();
    } catch (error) {
      console.error("Failed to rename category:", error);
      showToast({
        type: "error",
        title: "Failed to rename category",
        message: "An error occurred while renaming the category.",
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
    <Modal
      isOpen={true}
      onClose={onClose}
      title={t("modals.rename_category")}
      titleIcon={<Edit3 className="h-5 w-5 text-primary" />}
    >
      <p className="text-sm text-muted-foreground mb-4">
        {t("modals.enter_new_name")} &quot;{categoryName}&quot;
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            {t("modals.category_name")}
          </label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none"
            placeholder={t("modals.enter_category_name")}
            autoFocus
          />
        </div>

        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isRenaming}
          >
            {t("global.cancel")}
          </Button>
          <Button
            type="submit"
            disabled={!newName.trim() || newName === categoryName || isRenaming}
          >
            {isRenaming ? t("modals.renaming") : t("modals.rename")}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
