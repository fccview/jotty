"use client";

import { useState } from "react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface DeleteCategoryModalProps {
  isOpen: boolean;
  categoryPath: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const DeleteCategoryModal = ({
  isOpen,
  categoryPath,
  onClose,
  onConfirm,
}: DeleteCategoryModalProps) => {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const categoryName = categoryPath.split("/").pop() || categoryPath;
  const router = useRouter();

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      router.refresh();
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("common.deleteCategory")}>
      <div className="space-y-4">
        <p className="text-md lg:text-sm text-muted-foreground">
          Are you sure you want to delete the category &quot;{categoryName}
          &quot;?
          <br /> <br />
          <span className="text-destructive">
            This WILL delete everything within this category and cannot be
            undone.
          </span>
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>{t('common.cancel')}</Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? t("common.deleting") : t("common.delete")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
