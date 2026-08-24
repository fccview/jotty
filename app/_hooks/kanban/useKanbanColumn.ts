"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/app/_providers/ToastProvider";
import { useMultiClick } from "./useMultiClick";

export interface UseKanbanColumnArgs {
  title: string;
  onSortByStatus?: () => Promise<void> | void;
  onAddItem?: (text: string) => Promise<void>;
  onArchiveAll?: () => Promise<void>;
  archivableCount: number;
}

export const useKanbanColumn = ({
  title,
  onSortByStatus,
  onAddItem,
  onArchiveAll,
  archivableCount,
}: UseKanbanColumnArgs) => {
  const t = useTranslations();
  const { showToast } = useToast();

  const [showInlineInput, setShowInlineInput] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [showArchiveAllModal, setShowArchiveAllModal] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isSorting, setIsSorting] = useState(false);

  const handleSortByStatus = useCallback(async () => {
    if (!onSortByStatus || isSorting) return;
    setIsSorting(true);
    try {
      await onSortByStatus();
      showToast({
        type: "success",
        title: t("common.success"),
        message: t("kanban.sortedByPriority", { column: title }),
      });
    } catch {
      showToast({
        type: "error",
        title: t("common.error"),
        message: t("kanban.sortFailed"),
      });
    } finally {
      setIsSorting(false);
    }
  }, [onSortByStatus, isSorting, showToast, t, title]);

  const { handleClick: handleTitleClick } = useMultiClick({
    onTrigger: handleSortByStatus,
    disabled: !onSortByStatus,
  });

  const handleInlineSubmit = useCallback(
    async (text: string) => {
      if (!onAddItem) return;
      setIsAddingItem(true);
      setShowInlineInput(false);
      try {
        await onAddItem(text);
      } finally {
        setIsAddingItem(false);
      }
    },
    [onAddItem],
  );

  const handleArchiveAll = useCallback(async () => {
    if (!onArchiveAll || archivableCount === 0) return;
    setIsArchiving(true);
    try {
      await onArchiveAll();
    } finally {
      setIsArchiving(false);
    }
  }, [onArchiveAll, archivableCount]);

  return {
    showInlineInput,
    setShowInlineInput,
    isAddingItem,
    showArchiveAllModal,
    setShowArchiveAllModal,
    isArchiving,
    isSorting,
    handleTitleClick,
    handleSortByStatus,
    handleInlineSubmit,
    handleArchiveAll,
  };
};