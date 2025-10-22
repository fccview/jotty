"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { useRouter } from "next/navigation";

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
      title="Delete Category"
      titleIcon={<Trash2 className="h-5 w-5 text-destructive" />}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete the category &quot;{categoryName}
          &quot;?
          <br /> <br />
          <span className="text-destructive">
            This WILL delete everything within this category and cannot be
            undone.
          </span>
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
