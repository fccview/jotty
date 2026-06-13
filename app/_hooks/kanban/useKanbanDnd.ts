"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { dropItem } from "@/app/_server/actions/checklist-item";
import { Checklist, Item } from "@/app/_types";
import { DropResult } from "@/app/_types/dnd";
import {
  applyDrop,
  getColumnItems,
  visToColIndex,
} from "@/app/_utils/kanban/board-utils";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useToast } from "@/app/_providers/ToastProvider";

interface UseKanbanDndArgs {
  checklist: Checklist;
  setChecklist: (checklist: Checklist) => void;
  onUpdate: (checklist: Checklist) => void;
  visibleFor: (status: string) => Item[];
  fallbackMove: (itemId: string, status: string) => Promise<void>;
}

export const useKanbanDnd = ({
  checklist,
  setChecklist,
  onUpdate,
  visibleFor,
  fallbackMove,
}: UseKanbanDndArgs) => {
  const t = useTranslations();
  const { showToast } = useToast();
  const { user } = useAppMode();

  const handleDrop = useCallback(
    async (result: DropResult) => {
      const { itemId, targetListId, targetIndex } = result;

      if (!checklist.uuid) {
        console.warn("checklist has no uuid, falling back to status update");
        await fallbackMove(itemId, targetListId);
        return;
      }

      const visible = visibleFor(targetListId).filter(
        (item) => item.id !== itemId,
      );
      const column = getColumnItems(
        checklist.items,
        targetListId,
        checklist.statuses,
      ).filter((item) => item.id !== itemId);
      const colIndex = visToColIndex(visible, column, targetIndex);

      const snapshot = checklist;
      const now = new Date().toISOString();
      const optimistic = applyDrop(
        checklist,
        itemId,
        targetListId,
        colIndex,
        user?.username || "",
        now,
      );
      setChecklist(optimistic);
      onUpdate(optimistic);

      const formData = new FormData();
      formData.append("uuid", checklist.uuid);
      formData.append("itemId", itemId);
      formData.append("targetStatus", targetListId);
      formData.append("targetIndex", String(colIndex));

      const response = await dropItem(formData);
      if (response.success && response.data) {
        setChecklist(response.data);
        onUpdate(response.data);
        return;
      }

      console.error("dropItem failed:", response.error);
      setChecklist(snapshot);
      onUpdate(snapshot);
      showToast({
        type: "error",
        title: t("common.error"),
        message: t("kanban.moveFailed"),
      });
    },
    [checklist, setChecklist, onUpdate, visibleFor, fallbackMove, user?.username, showToast, t],
  );

  return { handleDrop };
};
