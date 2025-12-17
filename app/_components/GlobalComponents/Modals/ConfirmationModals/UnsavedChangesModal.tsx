"use client";

import {
  Alert02Icon,
  FloppyDiskIcon,
  MultiplicationSignIcon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";

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
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Unsaved Changes"
      titleIcon={<Alert02Icon className="h-5 w-5 text-destructive" />}
    >
      <div className="space-y-4">
        <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
          <h3 className="text-sm font-medium text-destructive mb-2">
            ⚠️ Unsaved Changes Detected
          </h3>
          <p className="text-sm text-muted-foreground">
            You have unsaved changes in {noteTitle}. If you leave now, your
            changes will be lost.
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          What would you like to do with your unsaved changes?
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <Button variant="outline" onClick={onClose} className="flex-1">
          <MultiplicationSignIcon className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            onDiscard();
            onClose();
          }}
          className="flex-1"
        >
          Discard
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
          Save & Leave
        </Button>
      </div>
    </Modal>
  );
};
