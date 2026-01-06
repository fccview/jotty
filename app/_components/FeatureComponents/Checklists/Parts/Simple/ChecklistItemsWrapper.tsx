"use client";

import { usePermissions } from "@/app/_providers/PermissionsProvider";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ConfirmModal } from "@/app/_components/GlobalComponents/Modals/ConfirmationModals/ConfirmModal";

interface checklistItemsWrapperProps {
  title: string;
  count: number;
  children: React.ReactNode;
  onBulkToggle: () => void;
  isLoading: boolean;
  isCompleted?: boolean;
  onClearAll?: () => void;
}

export const ChecklistItemsWrapper = ({
  title,
  count,
  children,
  onBulkToggle,
  isLoading,
  isCompleted = false,
  onClearAll,
}: checklistItemsWrapperProps) => {
  const t = useTranslations();
  const { permissions } = usePermissions();
  const [showBulkToggleConfirm, setShowBulkToggleConfirm] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  const handleBulkToggleClick = () => {
    if (count > 0) {
      setShowBulkToggleConfirm(true);
    }
  };

  const handleConfirmBulkToggle = () => {
    onBulkToggle();
  };

  const handleClearAllClick = () => {
    if (count > 0) {
      setShowClearAllConfirm(true);
    }
  };

  const handleConfirmClearAll = () => {
    if (onClearAll) {
      onClearAll();
    }
  };

  return (
    <>
      <div className="bg-card border-b border-border pb-4 lg:border-0 min-h-[40vh]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${isCompleted ? "bg-green-500" : "bg-muted-foreground"
                }`}
            ></div>
            {title} ({count})
            {isLoading && (
              <span className="ml-2 text-sm text-muted-foreground">{t('common.saving')}</span>
            )}
          </h3>
          {permissions?.canEdit && count > 0 && (
            <div className="flex items-center gap-2">
              {onClearAll && (
                <button
                  onClick={handleClearAllClick}
                  disabled={isLoading}
                  className="text-sm text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50"
                >
                  {t('checklists.clearAll')}
                </button>
              )}
              <button
                onClick={handleBulkToggleClick}
                disabled={isLoading}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                {isCompleted ? t('checklists.uncheckAll') : t('checklists.checkAll')}
              </button>
            </div>
          )}
        </div>
        <div className="space-y-2">{children}</div>
      </div>

      <ConfirmModal
        isOpen={showBulkToggleConfirm}
        onClose={() => setShowBulkToggleConfirm(false)}
        onConfirm={handleConfirmBulkToggle}
        title={isCompleted ? t('checklists.uncheckAllConfirmTitle') : t('checklists.checkAllConfirmTitle')}
        message={isCompleted
          ? t('checklists.uncheckAllConfirmMessage', { count })
          : t('checklists.checkAllConfirmMessage', { count })}
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        variant="default"
      />

      <ConfirmModal
        isOpen={showClearAllConfirm}
        onClose={() => setShowClearAllConfirm(false)}
        onConfirm={handleConfirmClearAll}
        title={t('checklists.clearAllConfirmTitle')}
        message={isCompleted
          ? t('checklists.clearAllCompletedConfirmMessage', { count })
          : t('checklists.clearAllIncompleteConfirmMessage', { count })}
        confirmText={t('checklists.clearAll')}
        cancelText={t('common.cancel')}
        variant="destructive"
      />
    </>
  );
};
