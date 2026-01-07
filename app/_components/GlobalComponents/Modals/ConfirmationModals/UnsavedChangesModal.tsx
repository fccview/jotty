"use client";

import { FloppyDiskIcon, MultiplicationSignIcon } from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { useTranslations } from "next-intl";

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onDiscard: () => void;
  noteTitle?: string;
}

export const UnsavedChangesModal = ({
  isOpen,
  onClose,
  onSave,
  onDiscard,
  noteTitle,
}: UnsavedChangesModalProps) => {
  const t = useTranslations();
  const displayTitle = noteTitle || t("common.thisNote");

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("common.unsavedChanges")}>
      <div className="space-y-4">
        <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-jotty">
          <h3 className="text-md lg:text-sm font-medium text-destructive mb-2">
            {t("common.unsavedChangesDetected")}
          </h3>
          <p className="text-md lg:text-sm text-muted-foreground">
            {t("common.unsavedChangesMessage", { noteTitle: displayTitle })}
          </p>
        </div>

        <p className="text-md lg:text-sm text-muted-foreground">
          {t("common.whatToDoWithUnsavedChanges")}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <Button variant="outline" onClick={onClose} className="flex-1">
          <MultiplicationSignIcon className="h-4 w-4 mr-2" />
          {t("common.cancel")}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            onDiscard();
            onClose();
          }}
          className="flex-1"
        >
          {t("common.discard")}
        </Button>
        <Button
          variant="default"
          onClick={() => {
            onSave();
            onClose();
          }}
          className="flex-1"
        >
          <FloppyDiskIcon className="h-4 w-4 mr-2" />
          {t("common.saveAndLeave")}
        </Button>
      </div>
    </Modal>
  );
};
