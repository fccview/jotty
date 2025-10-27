"use client";

import { AlertTriangle, Save, X } from "lucide-react";
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
  noteTitle = "this note",
}: UnsavedChangesModalProps) => {
  const t = useTranslations();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("modals.unsaved_changes")}
      titleIcon={<AlertTriangle className="h-5 w-5 text-destructive" />}
    >
      <div className="space-y-4">
        <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
          <h3 className="text-sm font-medium text-destructive mb-2">
            ⚠️ {t("modals.unsaved_changes_detected")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("modals.unsaved_changes_message")} {noteTitle}. {t("modals.changes_will_be_lost")}
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          {t("modals.what_to_do")}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <Button variant="outline" onClick={onClose} className="flex-1">
          <X className="h-4 w-4 mr-2" />
          {t("global.cancel")}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            onDiscard();
            onClose();
          }}
          className="flex-1"
        >
          {t("global.discard")}
        </Button>
        <Button
          variant="default"
          onClick={() => {
            onSave();
            onClose();
          }}
          className="flex-1"
        >
          <Save className="h-4 w-4 mr-2" />
          {t("modals.save_and_leave")}
        </Button>
      </div>
    </Modal>
  );
};
