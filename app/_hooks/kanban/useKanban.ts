"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Checklist, RecurrenceRule } from "@/app/_types";
import { DragPhase } from "@/app/_types/dnd";
import {
  createItem,
  updateItemStatus,
  createBulkItems,
} from "@/app/_server/actions/checklist-item";
import { getListById } from "@/app/_server/actions/checklist";
import {
  getCurrentUser,
  getUserByChecklist,
} from "@/app/_server/actions/users";
import { getColumnItems } from "@/app/_utils/kanban/board-utils";
import { useDragStore } from "@/app/_utils/dnd/drag-store";

interface UseKanbanBoardProps {
  checklist: Checklist;
  onUpdate: (updatedChecklist: Checklist) => void;
}

export const useKanbanBoard = ({
  checklist,
  onUpdate,
}: UseKanbanBoardProps) => {
  const [localChecklist, setLocalChecklist] = useState(checklist);
  const [isLoading, setIsLoading] = useState(false);
  const [showBulkPasteModal, setShowBulkPasteModal] = useState(false);
  const [focusKey, setFocusKey] = useState(0);

  const dragPhase = useDragStore((s) => s.phase);
  const pendingRef = useRef<Checklist | null>(null);

  useEffect(() => {
    if (
      checklist.id !== localChecklist.id ||
      checklist.updatedAt !== localChecklist.updatedAt
    ) {
      if (dragPhase !== DragPhase.IDLE) {
        pendingRef.current = checklist;
        return;
      }
      setLocalChecklist(checklist);
      setFocusKey((prev) => prev + 1);
    }
  }, [
    checklist,
    checklist.id,
    checklist.updatedAt,
    localChecklist.id,
    localChecklist.updatedAt,
    dragPhase,
  ]);

  useEffect(() => {
    if (dragPhase !== DragPhase.IDLE) return;
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (!pending) return;
    if (
      pending.id === localChecklist.id &&
      pending.updatedAt <= localChecklist.updatedAt
    ) {
      return;
    }
    setLocalChecklist(pending);
    setFocusKey((prev) => prev + 1);
  }, [dragPhase, localChecklist.id, localChecklist.updatedAt]);

  const refreshChecklist = useCallback(async () => {
    const checklistOwner = await getUserByChecklist(
      localChecklist.id,
      localChecklist.category || "Uncategorized",
    );
    const updatedChecklist = await getListById(
      localChecklist.id,
      checklistOwner?.data?.username,
      localChecklist.category,
    );
    if (updatedChecklist) {
      setLocalChecklist(updatedChecklist);
      onUpdate(updatedChecklist);
    }
  }, [localChecklist.id, localChecklist.category, onUpdate]);

  const getItemsByStatus = useCallback(
    (status: string) =>
      getColumnItems(localChecklist.items, status, localChecklist.statuses),
    [localChecklist.items, localChecklist.statuses],
  );

  const _handleItemStatusUpdate = async (itemId: string, newStatus: string) => {
    const formData = new FormData();
    formData.append("listId", localChecklist.id);
    formData.append("itemId", itemId);
    formData.append("status", newStatus);
    formData.append("category", localChecklist.category || "Uncategorized");

    const result = await updateItemStatus(formData);

    if (result.success && result.data) {
      setLocalChecklist(result.data as Checklist);
      onUpdate(result.data as Checklist);
    } else {
      await refreshChecklist();
    }
  };

  const handleAddItem = async (text: string, recurrence?: RecurrenceRule, status?: string) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append("listId", localChecklist.id);
    formData.append("text", text);
    formData.append("category", localChecklist.category || "Uncategorized");

    const currentUser = await getCurrentUser();

    if (recurrence) {
      formData.append("recurrence", JSON.stringify(recurrence));
    }

    if (status) {
      formData.append("status", status);
    }

    const result = await createItem(
      localChecklist,
      formData,
      currentUser?.username,
    );

    const checklistOwner = await getUserByChecklist(
      localChecklist.id,
      localChecklist.category || "Uncategorized",
    );

    const updatedList = await getListById(
      localChecklist.id,
      checklistOwner?.data?.username,
      localChecklist.category,
    );
    if (updatedList) {
      setLocalChecklist(updatedList);
      onUpdate(updatedList);
    }
    setIsLoading(false);

    if (result.success && result.data) {
      setFocusKey((prev) => prev + 1);
    }
  };

  const handleBulkPaste = async (itemsText: string) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append("listId", localChecklist.id);
    formData.append("itemsText", itemsText);
    formData.append("category", localChecklist.category || "Uncategorized");
    const result = await createBulkItems(formData);
    setIsLoading(false);

    if (result.success && result.data) {
      setLocalChecklist(result.data as Checklist);
      onUpdate(result.data as Checklist);
    }
  };

  const handleItemUpdate = useCallback(
    (updatedChecklist: Checklist) => {
      setLocalChecklist(updatedChecklist);
      onUpdate(updatedChecklist);
      refreshChecklist();
    },
    [onUpdate, refreshChecklist],
  );

  return {
    localChecklist,
    setLocalChecklist,
    isLoading,
    showBulkPasteModal,
    setShowBulkPasteModal,
    focusKey,
    setFocusKey,
    refreshChecklist,
    handleItemUpdate,
    getItemsByStatus,
    handleAddItem,
    handleBulkPaste,
    handleItemStatusUpdate: _handleItemStatusUpdate,
  };
};
