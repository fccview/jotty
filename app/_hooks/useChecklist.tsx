"use client";

import { useState, useEffect, useRef } from "react";
import { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Checklist } from "@/app/_types";
import {
  deleteList,
  convertChecklistType,
} from "@/app/_server/actions/checklist";
import {
  createItem,
  updateItem,
  reorderItems,
  createBulkItems,
  bulkToggleItems,
  bulkDeleteItems,
} from "@/app/_server/actions/checklist-item";
import { useRouter } from "next/navigation";

interface UseChecklistProps {
  list: Checklist;
  onUpdate: (updatedChecklist: Checklist) => void;
  onDelete?: (deletedId: string) => void;
}

export const useChecklist = ({
  list,
  onUpdate,
  onDelete,
}: UseChecklistProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showBulkPasteModal, setShowBulkPasteModal] = useState(false);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [localList, setLocalList] = useState(list);
  const [focusKey, setFocusKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState<string[]>([]);
  const isInitialMount = useRef(true);

  useEffect(() => {
    setLocalList(list);
  }, [list]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    onUpdate(localList);
  }, [localList, onUpdate]);

  useEffect(() => {
    if (itemsToDelete.length === 0) {
      return;
    }

    const timer = setTimeout(async () => {
      const idsToProcess = [...itemsToDelete];

      const formData = new FormData();
      formData.append("listId", list.id);
      formData.append("itemIds", JSON.stringify(idsToProcess));
      formData.append("category", list.category || "Uncategorized");

      try {
        const result = await bulkDeleteItems(formData);
        if (!result.success) {
          throw new Error("Server action failed");
        }
      } catch (error) {
        console.error("Failed to bulk delete items:", error);
        router.refresh();
      } finally {
        setItemsToDelete([]);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [itemsToDelete, list.id, router]);

  const handleDeleteItem = (itemId: string) => {
    setLocalList((currentList) => ({
      ...currentList,
      items: currentList.items.filter((item) => item.id !== itemId),
    }));

    setFocusKey((prev) => prev + 1);

    setItemsToDelete((prevItems) => {
      if (prevItems.includes(itemId)) {
        return prevItems;
      }
      return [...prevItems, itemId];
    });
  };

  const handleDeleteList = async () => {
    if (confirm("Are you sure you want to delete this checklist?")) {
      const formData = new FormData();
      formData.append("id", localList.id);
      formData.append("category", localList.category || "Uncategorized");
      await deleteList(formData);
      onDelete?.(localList.id);
    }
  };

  const handleToggleItem = async (itemId: string, completed: boolean) => {
    const formData = new FormData();
    formData.append("listId", localList.id);
    formData.append("itemId", itemId);
    formData.append("completed", String(completed));
    formData.append("category", localList.category || "Uncategorized");
    const result = await updateItem(formData);

    if (result.success && result.data) {
      setLocalList(result.data);
    }
  };

  const handleEditItem = async (itemId: string, text: string) => {
    const formData = new FormData();
    formData.append("listId", localList.id);
    formData.append("itemId", itemId);
    formData.append("text", text);
    formData.append("category", localList.category || "Uncategorized");
    const result = await updateItem(formData);

    if (result.success) {
      setLocalList((currentList) => ({
        ...currentList,
        items: currentList.items.map((item) =>
          item.id === itemId ? { ...item, text } : item
        ),
      }));
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      let newItems: any[] = [];
      const incompleteItems = localList.items.filter((item) => !item.completed);
      const completedItems = localList.items.filter((item) => item.completed);

      const incompleteOldIndex = incompleteItems.findIndex(
        (item) => item.id === active.id
      );
      const incompleteNewIndex = incompleteItems.findIndex(
        (item) => item.id === over?.id
      );

      if (incompleteOldIndex !== -1 && incompleteNewIndex !== -1) {
        const newIncompleteItems = arrayMove(
          incompleteItems,
          incompleteOldIndex,
          incompleteNewIndex
        );
        newItems = [...newIncompleteItems, ...completedItems].map(
          (item, index) => ({ ...item, order: index })
        );
      } else {
        const completedOldIndex = completedItems.findIndex(
          (item) => item.id === active.id
        );
        const completedNewIndex = completedItems.findIndex(
          (item) => item.id === over?.id
        );

        if (completedOldIndex !== -1 && completedNewIndex !== -1) {
          const newCompletedItems = arrayMove(
            completedItems,
            completedOldIndex,
            completedNewIndex
          );
          newItems = [...incompleteItems, ...newCompletedItems].map(
            (item, index) => ({ ...item, order: index })
          );
        }
      }

      if (newItems.length > 0) {
        setLocalList({ ...localList, items: newItems });

        const itemIds = newItems.map((item) => item.id);
        const formData = new FormData();
        formData.append("listId", localList.id);
        formData.append("itemIds", JSON.stringify(itemIds));
        formData.append("currentItems", JSON.stringify(newItems));
        formData.append("category", localList.category || "Uncategorized");
        const result = await reorderItems(formData);

        if (!result.success) {
          setLocalList(list);
        }
      }
    }
  };

  const handleBulkPaste = async (itemsText: string) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append("listId", localList.id);
    formData.append("itemsText", itemsText);
    formData.append("category", localList.category || "Uncategorized");
    const result = await createBulkItems(formData);
    setIsLoading(false);

    if (result.success && result.data) {
      setLocalList(result.data as Checklist);
    }
  };

  const handleConvertType = () => {
    setShowConversionModal(true);
  };

  const getNewType = (currentType: "simple" | "task"): "simple" | "task" => {
    return currentType === "simple" ? "task" : "simple";
  };

  const handleConfirmConversion = async () => {
    setIsLoading(true);
    const newType = getNewType(localList.type);
    const formData = new FormData();
    formData.append("listId", localList.id);
    formData.append("newType", newType);
    formData.append("category", localList.category || "Uncategorized");
    const result = await convertChecklistType(formData);
    setIsLoading(false);

    if (result.success && result.data) {
      setLocalList(result.data as Checklist);
    }
  };

  const handleBulkToggle = async (completed: boolean) => {
    const targetItems = completed
      ? localList.items.filter((i) => !i.completed)
      : localList.items.filter((i) => i.completed);
    if (targetItems.length === 0) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append("listId", localList.id);
    formData.append("completed", String(completed));
    formData.append(
      "itemIds",
      JSON.stringify(targetItems.map((item) => item.id))
    );
    formData.append("category", localList.category || "Uncategorized");

    const result = await bulkToggleItems(formData);
    setIsLoading(false);

    if (result.success && result.data) {
      setLocalList(result.data as Checklist);
      setFocusKey((prev) => prev + 1);
    }
  };

  const handleCreateItem = async (text: string) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append("listId", localList.id);
    formData.append("text", text);
    formData.append("category", localList.category || "Uncategorized");
    const result = await createItem(formData);
    setIsLoading(false);

    if (result.success && result.data) {
      setLocalList((currentList) => ({
        ...currentList,
        items: [...currentList.items, result.data],
      }));
      router.refresh();
      setFocusKey((prev) => prev + 1);
    }
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(localList.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy ID:", err);
    }
  };

  const incompleteItems = localList.items.filter((item) => !item.completed);
  const completedItems = localList.items.filter((item) => item.completed);

  return {
    isLoading,
    showShareModal,
    setShowShareModal,
    showBulkPasteModal,
    setShowBulkPasteModal,
    showConversionModal,
    setShowConversionModal,
    localList,
    focusKey,
    setFocusKey,
    copied,
    handleDeleteList,
    handleToggleItem,
    handleEditItem,
    handleDeleteItem,
    handleDragEnd,
    handleBulkPaste,
    handleConvertType,
    getNewType,
    handleConfirmConversion,
    handleBulkToggle,
    handleCreateItem,
    handleCopyId,
    incompleteItems,
    completedItems,
    totalCount: localList.items.length,
    deletingItemsCount: itemsToDelete.length,
  };
};
