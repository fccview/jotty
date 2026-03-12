"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Checklist, KanbanStatus, RecurrenceRule, Result } from "@/app/_types";
import {
  createItem,
  updateItemStatus,
  createBulkItems,
  reorderItems,
} from "@/app/_server/actions/checklist-item";
import { getListById } from "@/app/_server/actions/checklist";
import { TaskStatus } from "@/app/_types/enums";
import { getCurrentUser, getUserByChecklist } from "@/app/_server/actions/users";
import { DEFAULT_KANBAN_STATUSES } from "@/app/_consts/kanban";

interface UseKanbanBoardProps {
  checklist: Checklist;
  onUpdate: (updatedChecklist: Checklist) => void;
}

export const useKanbanBoard = ({
  checklist,
  onUpdate,
}: UseKanbanBoardProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [localChecklist, setLocalChecklist] = useState(checklist);
  const [isLoading, setIsLoading] = useState(false);
  const [showBulkPasteModal, setShowBulkPasteModal] = useState(false);
  const [focusKey, setFocusKey] = useState(0);

  const dragOriginalStatusRef = useRef<string | null>(null);

  const validStatusIds = (localChecklist.statuses || DEFAULT_KANBAN_STATUSES).map(
    (s) => s.id
  );

  useEffect(() => {
    if (checklist.id !== localChecklist.id || checklist.updatedAt !== localChecklist.updatedAt) {
      setLocalChecklist(checklist);
      setFocusKey((prev) => prev + 1);
    }
  }, [checklist.id, checklist.updatedAt, localChecklist.id, localChecklist.updatedAt]);

  const refreshChecklist = useCallback(async () => {
    const checklistOwner = await getUserByChecklist(
      localChecklist.id,
      localChecklist.category || "Uncategorized"
    );
    const updatedChecklist = await getListById(
      localChecklist.id,
      checklistOwner?.data?.username,
      localChecklist.category
    );
    if (updatedChecklist) {
      setLocalChecklist(updatedChecklist);
      onUpdate(updatedChecklist);
    }
  }, [localChecklist.id, localChecklist.category, onUpdate]);

  const getItemsByStatus = useCallback((status: string) => {
    const firstStatus = (localChecklist.statuses || DEFAULT_KANBAN_STATUSES)
      .sort((a, b) => a.order - b.order)[0]?.id || TaskStatus.TODO;
    return localChecklist.items.filter((item) => {
      if (item.isArchived) return false;
      if (item.status === status) return true;
      if (status === firstStatus) {
        const hasValidStatus = validStatusIds.includes(item.status || "");
        return !hasValidStatus;
      }
      return false;
    });
  }, [localChecklist.items, localChecklist.statuses, validStatusIds]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = event.active.id as string;
    setActiveId(id);

    const item = localChecklist.items.find((i) => i.id === id);
    dragOriginalStatusRef.current = item?.status || TaskStatus.TODO;
  }, [localChecklist.items]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    setOverId(over ? (over.id as string) : null);

    if (!over || !activeId) return;

    const activeItem = localChecklist.items.find((item) => item.id === activeId);
    if (!activeItem) return;

    const overIdStr = over.id as string;

    let targetStatus: string | null = null;
    if (validStatusIds.includes(overIdStr)) {
      targetStatus = overIdStr;
    } else {
      const overItem = localChecklist.items.find((item) => item.id === overIdStr);
      if (overItem) targetStatus = overItem.status || TaskStatus.TODO;
    }

    if (targetStatus && activeItem.status !== targetStatus) {
      setLocalChecklist((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.id === activeId ? { ...item, status: targetStatus } : item
        ),
      }));
    }
  }, [activeId, localChecklist.items, validStatusIds]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    const origStatus = dragOriginalStatusRef.current;
    setActiveId(null);
    setOverId(null);
    dragOriginalStatusRef.current = null;

    if (!over) {
      if (origStatus) {
        setLocalChecklist((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.id === (active.id as string) ? { ...item, status: origStatus } : item
          ),
        }));
      }
      return;
    }

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    const droppedOnColumn = validStatusIds.includes(overIdStr);
    const targetStatus = droppedOnColumn
      ? overIdStr
      : (localChecklist.items.find((item) => item.id === overIdStr)?.status || TaskStatus.TODO);

    const isCrossColumn = origStatus !== targetStatus;

    const columnItems = localChecklist.items.filter(
      (item) => item.status === targetStatus && !item.isArchived && item.id !== activeIdStr
    );

    let insertIndex: number;
    if (droppedOnColumn) {
      insertIndex = columnItems.length;
    } else {
      const overIndex = columnItems.findIndex((item) => item.id === overIdStr);
      insertIndex = overIndex === -1 ? columnItems.length : overIndex;
    }

    const activeItem = localChecklist.items.find((item) => item.id === activeIdStr);
    if (!activeItem) return;

    const updatedActiveItem = { ...activeItem, status: targetStatus };
    const newColumnItems = [...columnItems];
    newColumnItems.splice(insertIndex, 0, updatedActiveItem);

    const otherItems = localChecklist.items.filter(
      (item) => (item.status !== targetStatus || item.isArchived) && item.id !== activeIdStr
    );
    const allItems = [...otherItems, ...newColumnItems];

    setLocalChecklist((prev) => ({
      ...prev,
      items: allItems,
      updatedAt: new Date().toISOString(),
    }));

    if (isCrossColumn) {
      await _handleItemStatusUpdate(activeIdStr, targetStatus);
    } else {
      if (droppedOnColumn || activeIdStr === overIdStr) return;

      const formData = new FormData();
      formData.append("listId", localChecklist.id);
      formData.append("activeItemId", activeIdStr);
      formData.append("overItemId", overIdStr);
      formData.append("category", localChecklist.category || "Uncategorized");

      const result = await reorderItems(formData);
      if (result.success) {
        await refreshChecklist();
      }
    }
  }, [localChecklist, validStatusIds, refreshChecklist]);

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

  const handleAddItem = async (text: string, recurrence?: RecurrenceRule) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append("listId", localChecklist.id);
    formData.append("text", text);
    formData.append("category", localChecklist.category || "Uncategorized");

    const currentUser = await getCurrentUser();

    if (recurrence) {
      formData.append("recurrence", JSON.stringify(recurrence));
    }

    const result = await createItem(
      localChecklist,
      formData,
      currentUser?.username
    );

    const checklistOwner = await getUserByChecklist(
      localChecklist.id,
      localChecklist.category || "Uncategorized"
    );

    const updatedList = await getListById(
      localChecklist.id,
      checklistOwner?.data?.username,
      localChecklist.category
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

  const handleItemUpdate = useCallback((updatedChecklist: Checklist) => {
    setLocalChecklist(updatedChecklist);
    onUpdate(updatedChecklist);
    refreshChecklist();
  }, [onUpdate, refreshChecklist]);

  const activeItem = activeId
    ? localChecklist.items.find((item) => item.id === activeId)
    : null;

  return {
    activeId,
    overId,
    localChecklist,
    isLoading,
    showBulkPasteModal,
    setShowBulkPasteModal,
    focusKey,
    setFocusKey,
    refreshChecklist,
    handleItemUpdate,
    getItemsByStatus,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleAddItem,
    handleBulkPaste,
    handleItemStatusUpdate: _handleItemStatusUpdate,
    activeItem,
  };
};
