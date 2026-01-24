"use client";

import { useState } from "react";
import { Alert02Icon } from "hugeicons-react";
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
  const t = useTranslations();
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
      title={t('checklists.bulkAddItems')}
      className="lg:max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {showUnsavedWarning && (
          <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-jotty">
            <div className="flex items-start gap-2">
              <Alert02Icon className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-md lg:text-sm font-medium text-destructive mb-1">
                  {t('checklists.itemsNotAddedYet')}
                </h3>
                <p className="text-md lg:text-sm text-muted-foreground">
                  {t('checklists.youHaveItemsThatWillNotBeAdded', { count: itemCount })}
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <label
            htmlFor="itemsText"
            className="block text-md lg:text-sm font-medium text-foreground mb-2"
          >
            {t('checklists.pasteYourList')}
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
            className="w-full h-32 px-3 py-2 border border-input bg-background rounded-jotty text-md lg:text-sm focus:outline-none focus:ring-none focus:ring-ring focus:ring-offset-2 resize-none"
            disabled={isLoading}
          />
          {itemCount > 0 && !showUnsavedWarning && (
            <p className="text-md lg:text-xs text-muted-foreground mt-1">
              {t('checklists.itemsWillBeAdded', { count: itemCount })}
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
                {t('common.closeWithoutAdding')}
              </Button>
              <Button type="submit" disabled={isLoading || !itemsText.trim()}>
                {isLoading
                  ? t('common.adding')
                  : `${t('checklists.addItems', { count: itemCount })}`}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >{t('common.cancel')}</Button>
              <Button type="submit" disabled={isLoading || !itemsText.trim()}>
                {isLoading
                  ? t('common.adding')
                  : `${t('checklists.addItems', { count: itemCount })}`}
              </Button>
            </>
          )}
        </div>
      </form>
    </Modal>
  );
};
