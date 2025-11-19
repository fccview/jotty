"use client";

import { useState } from "react";
import { ClipboardList, AlertTriangle } from "lucide-react";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";

interface BulkPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (itemsText: string) => void;
  isLoading?: boolean;
}

export const BulkPasteModal = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: BulkPasteModalProps) => {
  const [itemsText, setItemsText] = useState("");
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!itemsText.trim()) return;

    onSubmit(itemsText.trim());
    setItemsText("");
    setShowUnsavedWarning(false);
    onClose();
  };

  const handleClose = () => {
    if (itemsText.trim() && !showUnsavedWarning) {
      setShowUnsavedWarning(true);
    } else {
      setItemsText("");
      setShowUnsavedWarning(false);
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setItemsText("");
    setShowUnsavedWarning(false);
    onClose();
  };

  const lines = itemsText.split("\n").filter((line) => line.trim());
  const itemCount = lines.length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk Add Items"
      titleIcon={<ClipboardList className="h-5 w-5" />}
      className="lg:max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {showUnsavedWarning && (
          <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-destructive mb-1">
                  Items Not Added Yet
                </h3>
                <p className="text-sm text-muted-foreground">
                  You have {itemCount} item{itemCount !== 1 ? "s" : ""} that {itemCount !== 1 ? "haven't" : "hasn't"} been added. Close without adding or add them now.
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <label
            htmlFor="itemsText"
            className="block text-sm font-medium text-foreground mb-2"
          >
            Paste your list (one item per line)
          </label>
          <textarea
            id="itemsText"
            value={itemsText}
            onChange={(e) => {
              setItemsText(e.target.value);
              setShowUnsavedWarning(false);
            }}
            placeholder={`Item 1
Item 2
Item 3...`}
            className="w-full h-32 px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none"
            disabled={isLoading}
          />
          {itemCount > 0 && !showUnsavedWarning && (
            <p className="text-xs text-muted-foreground mt-1">
              {itemCount} item{itemCount !== 1 ? "s" : ""} will be added
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          {showUnsavedWarning ? (
            <>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmClose}
                disabled={isLoading}
              >
                Close Without Adding
              </Button>
              <Button type="submit" disabled={isLoading || !itemsText.trim()}>
                {isLoading
                  ? "Adding..."
                  : `Add ${itemCount} Item${itemCount !== 1 ? "s" : ""}`}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !itemsText.trim()}>
                {isLoading
                  ? "Adding..."
                  : `Add ${itemCount} Item${itemCount !== 1 ? "s" : ""}`}
              </Button>
            </>
          )}
        </div>
      </form>
    </Modal>
  );
};
