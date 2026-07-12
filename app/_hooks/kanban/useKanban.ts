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
import { getCurrentUser } from "@/app/_server/actions/users";
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
    const isDifferentList = checklist.uuid !== localChecklist.uuid;
    const isNewer = checklist.updatedAt > localChecklist.updatedAt;

    if (isDifferentList || isNewer) {
      if (dragPhase !== DragPhase.IDLE) {
        pendingRef.current = checklist;
        return;
      }
      setLocalChecklist(checklist);
      setFocusKey((prev) => prev + 1);
    }
  }, [
    checklist,
    checklist.uuid,
    checklist.updatedAt,
    localChecklist.uuid,
    localChecklist.updatedAt,
    dragPhase,
  ]);

  useEffect(() => {
    if (dragPhase !== DragPhase.IDLE) return;
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (!pending) return;
    if (
      pending.uuid === localChecklist.uuid &&
      pending.updatedAt <= localChecklist.updatedAt
    ) {
      return;
    }
    setLocalChecklist(pending);
    setFocusKey((prev) => prev + 1);
  }, [dragPhase, localChecklist.uuid, localChecklist.updatedAt]);

  const refreshChecklist = useCallback(async () => {
    const updatedChecklist = await getListById(
      localChecklist.uuid || "",
      localChecklist.owner,
    );
    if (updatedChecklist) {
      setLocalChecklist(updatedChecklist);
      onUpdate(updatedChecklist);
    }
  }, [localChecklist.uuid, localChecklist.owner, onUpdate]);

  const getItemsByStatus = useCallback(
    (status: string) =>
      getColumnItems(localChecklist.items, status, localChecklist.statuses),
    [localChecklist.items, localChecklist.statuses],
  );

  const _handleItemStatusUpdate = async (itemId: string, newStatus: string) => {
    const formData = new FormData();
    formData.append("uuid", localChecklist.uuid || "");
    formData.append("itemId", itemId);
    formData.append("status", newStatus);

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
    formData.append("uuid", localChecklist.uuid || "");
    formData.append("text", text);

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

    const updatedList = await getListById(
      localChecklist.uuid || "",
      localChecklist.owner || currentUser?.username,
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
    formData.append("uuid", localChecklist.uuid || "");
    formData.append("itemsText", itemsText);
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
