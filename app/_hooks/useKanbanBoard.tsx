"use client";

import { useState, useEffect } from "react";
import { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Checklist } from "@/app/_types";
import {
  createItem,
  updateItemStatus,
  createBulkItems,
  reorderItems,
} from "@/app/_server/actions/checklist-item";
import { getLists } from "@/app/_server/actions/checklist";
import { TaskStatus } from "@/app/_types/enums";

interface UseKanbanBoardProps {
  checklist: Checklist;
  onUpdate: (updatedChecklist: Checklist) => void;
}

export const useKanbanBoard = ({
  checklist,
  onUpdate,
}: UseKanbanBoardProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localChecklist, setLocalChecklist] = useState(checklist);
  const [isLoading, setIsLoading] = useState(false);
  const [showBulkPasteModal, setShowBulkPasteModal] = useState(false);
  const [focusKey, setFocusKey] = useState(0);

  useEffect(() => {
    setLocalChecklist(checklist);
    setFocusKey((prev) => prev + 1);
  }, [checklist]);

  const refreshChecklist = async () => {
    const result = await getLists();
    if (result.success && result.data) {
      const updatedChecklist = result.data.find(
        (list) => list.id === checklist.id
      );
      if (updatedChecklist) {
        setLocalChecklist(updatedChecklist);
        onUpdate(updatedChecklist);
      }
    }
  };

  const getItemsByStatus = (status: TaskStatus) => {
    return localChecklist.items.filter((item) => item.status === status);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeItem = localChecklist.items.find(
      (item) => item.id === activeId
    );
    if (!activeItem) return;

    let newStatus: TaskStatus;
    let isReordering = false;

    if (
      overId === TaskStatus.TODO ||
      overId === TaskStatus.IN_PROGRESS ||
      overId === TaskStatus.COMPLETED ||
      overId === TaskStatus.PAUSED
    ) {
      newStatus = overId;
    } else {
      const overItem = localChecklist.items.find((item) => item.id === overId);
      if (!overItem) return;
      newStatus = overItem.status || TaskStatus.TODO;

      if (activeItem.status === newStatus) {
        isReordering = true;
      }
    }

    if (isReordering) {
      const itemsWithStatus = localChecklist.items.filter(
        (item) => item.status === newStatus
      );
      const oldIndex = itemsWithStatus.findIndex(
        (item) => item.id === activeId
      );
      const newIndex = itemsWithStatus.findIndex((item) => item.id === overId);

      if (oldIndex === -1 || newIndex === -1) return;

      const reorderedItems = arrayMove(itemsWithStatus, oldIndex, newIndex);

      const otherItems = localChecklist.items.filter(
        (item) => item.status !== newStatus
      );

      const allItems = [...otherItems, ...reorderedItems];

      const optimisticChecklist = {
        ...localChecklist,
        items: allItems,
        updatedAt: new Date().toISOString(),
      };
      setLocalChecklist(optimisticChecklist);

      const formData = new FormData();
      formData.append("listId", localChecklist.id);
      formData.append(
        "itemIds",
        JSON.stringify(allItems.map((item) => item.id))
      );
      formData.append("currentItems", JSON.stringify(allItems));
      formData.append("category", localChecklist.category || "Uncategorized");

      const result = await reorderItems(formData);

      if (result.success) {
        await refreshChecklist();
      }
    } else {
      if (activeItem.status === newStatus) return;

      const formData = new FormData();
      formData.append("listId", localChecklist.id);
      formData.append("itemId", activeId);
      formData.append("status", newStatus);
      formData.append("category", localChecklist.category || "Uncategorized");

      const result = await updateItemStatus(formData);

      if (result.success && result.data) {
        setLocalChecklist(result.data as Checklist);
        onUpdate(result.data as Checklist);
      }
    }
  };

  const handleAddItem = async (text: string) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append("listId", localChecklist.id);
    formData.append("text", text);
    formData.append("category", localChecklist.category || "Uncategorized");

    const result = await createItem(formData);
    setIsLoading(false);

    if (result.success && result.data) {
      const updatedList = {
        ...localChecklist,
        items: [...localChecklist.items, result.data],
        updatedAt: new Date().toISOString(),
      };
      setLocalChecklist(updatedList as Checklist);
      onUpdate(updatedList as Checklist);
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

  const activeItem = activeId
    ? localChecklist.items.find((item) => item.id === activeId)
    : null;

  return {
    activeId,
    localChecklist,
    isLoading,
    showBulkPasteModal,
    setShowBulkPasteModal,
    focusKey,
    setFocusKey,
    refreshChecklist,
    getItemsByStatus,
    handleDragStart,
    handleDragEnd,
    handleAddItem,
    handleBulkPaste,
    activeItem,
  };
};
