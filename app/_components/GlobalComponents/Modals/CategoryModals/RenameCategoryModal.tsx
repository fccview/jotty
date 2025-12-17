"use client";

import { useState } from "react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Modal } from "../Modal";
import { useToast } from "@/app/_providers/ToastProvider";
import { useRouter } from "next/navigation";

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
    <Modal isOpen={true} onClose={onClose} title="Rename Category">
      <p className="text-sm text-muted-foreground mb-4">
        Enter a new name for &quot;{categoryName}&quot;
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Category Name
          </label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-jotty text-foreground placeholder:text-muted-foreground focus:ring-none focus:ring-primary focus:outline-none"
            placeholder="Enter category name..."
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
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!newName.trim() || newName === categoryName || isRenaming}
          >
            {isRenaming ? "Renaming..." : "Rename"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
