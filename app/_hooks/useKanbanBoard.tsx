"use client";

import { useState, useEffect } from "react";
import { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Checklist, KanbanStatus, RecurrenceRule, Result } from "@/app/_types";
import {
  createItem,
  updateItemStatus,
  createBulkItems,
  reorderItems,
} from "@/app/_server/actions/checklist-item";
import {
  getListById,
  getUserChecklists,
} from "@/app/_server/actions/checklist";
import { TaskStatus, TaskStatusLabels } from "@/app/_types/enums";
import { getCurrentUser, getUserByChecklist } from "../_server/actions/users";

interface UseKanbanBoardProps {
  checklist: Checklist;
  onUpdate: (updatedChecklist: Checklist) => void;
}

const defaultStatuses: KanbanStatus[] = [
  {
    id: TaskStatus.TODO,
    label: TaskStatusLabels.TODO,
    order: 0,
  },
  {
    id: TaskStatus.IN_PROGRESS,
    label: TaskStatusLabels.IN_PROGRESS,
    order: 1,
  },
  {
    id: TaskStatus.COMPLETED,
    label: TaskStatusLabels.COMPLETED,
    order: 2,
  },
  {
    id: TaskStatus.PAUSED,
    label: TaskStatusLabels.PAUSED,
    order: 3,
  },
];

export const useKanbanBoard = ({
  checklist,
  onUpdate,
}: UseKanbanBoardProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localChecklist, setLocalChecklist] = useState(checklist);
  const [isLoading, setIsLoading] = useState(false);
  const [showBulkPasteModal, setShowBulkPasteModal] = useState(false);
  const [focusKey, setFocusKey] = useState(0);

  const validStatusIds = (localChecklist.statuses || defaultStatuses).map(
    (s) => s.id
  );

  useEffect(() => {
    if (checklist.id !== localChecklist.id || checklist.updatedAt !== localChecklist.updatedAt) {
      setLocalChecklist(checklist);
      setFocusKey((prev) => prev + 1);
    }
  }, [checklist.id, checklist.updatedAt, localChecklist.id, localChecklist.updatedAt]);

  const refreshChecklist = async () => {
    const result = (await getUserChecklists()) as Result<Checklist[]>;
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

  const getItemsByStatus = (status: string) => {
    return localChecklist.items.filter(
      (item) => item.status === status && !item.isArchived
    );
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

    let newStatus: string;
    let isReordering = false;

    if (validStatusIds.includes(overId)) {
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
      await handleItemStatusUpdate(activeId, newStatus);
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
    }
    setIsLoading(false);

    if (result.success && result.data) {
      setFocusKey((prev) => prev + 1);
    } else {
      console.error("Failed to create item:", result.error);
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

  const handleItemStatusUpdate = async (itemId: string, newStatus: string) => {
    const item = localChecklist.items.find((item) => item.id === itemId);
    if (!item) {
      return;
    }

    if (item.status === newStatus) {
      return;
    }

    const formData = new FormData();
    formData.append("listId", localChecklist.id);
    formData.append("itemId", itemId);
    formData.append("status", newStatus);
    formData.append("category", localChecklist.category || "Uncategorized");

    const result = await updateItemStatus(formData);

    if (result.success && result.data) {
      setLocalChecklist(result.data as Checklist);
      onUpdate(result.data as Checklist);
    }
  };

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
    handleItemStatusUpdate,
    activeItem,
  };
};
