"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useTranslations } from "next-intl";

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
  const t = useTranslations();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemsText.trim()) return;

    onSubmit(itemsText.trim());
    setItemsText("");
    onClose();
  };

  const handleClose = () => {
    setItemsText("");
    onClose();
  };

  const lines = itemsText.split("\n").filter((line) => line.trim());
  const itemCount = lines.length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("modals.bulk_add_items")}
      titleIcon={<ClipboardList className="h-5 w-5" />}
      className="lg:max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="itemsText"
            className="block text-sm font-medium text-foreground mb-2"
          >
            {t("modals.paste_list")}
          </label>
          <textarea
            id="itemsText"
            value={itemsText}
            onChange={(e) => setItemsText(e.target.value)}
            placeholder={`Item 1
Item 2
Item 3...`}
            className="w-full h-32 px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none"
            disabled={isLoading}
          />
          {itemCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {itemCount} {itemCount !== 1 ? t("modals.items_will_be_added") : t("modals.item_will_be_added")}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            {t("global.cancel")}
          </Button>
          <Button type="submit" disabled={isLoading || !itemsText.trim()}>
            {isLoading
              ? t("modals.adding")
              : `${t("modals.add_items")} ${itemCount}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
