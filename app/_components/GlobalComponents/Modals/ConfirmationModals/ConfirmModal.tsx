"use client";

import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { useTranslations } from "next-intl";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
}

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = "default",
}: ConfirmModalProps) => {
  const t = useTranslations();

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-md lg:text-sm text-muted-foreground">{message}</p>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {cancelText || t("common.cancel")}
          </Button>
          <Button variant={variant} onClick={handleConfirm}>
            {confirmText || t("common.confirm")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
