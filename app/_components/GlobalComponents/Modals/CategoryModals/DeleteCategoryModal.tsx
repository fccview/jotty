"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
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
  const [isLoading, setIsLoading] = useState(false);
  const categoryName = categoryPath.split("/").pop() || categoryPath;
  const router = useRouter();
  const t = useTranslations();

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("modals.delete_category")}
      titleIcon={<Trash2 className="h-5 w-5 text-destructive" />}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t("modals.confirm_delete_category")} &quot;{categoryName}
          &quot;?
          <br /> <br />
          <span className="text-destructive">
            {t("modals.will_delete_everything")}
          </span>
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t("global.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? t("modals.deleting") : t("global.delete")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
