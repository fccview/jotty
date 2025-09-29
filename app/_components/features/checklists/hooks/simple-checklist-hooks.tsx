"use client";

import { useState, useEffect } from "react";
import { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Checklist } from "@/app/_types";
import {
  deleteListAction,
  createItemAction,
  updateItemAction,
  deleteItemAction,
  reorderItemsAction,
  createBulkItemsAction,
  convertChecklistTypeAction,
  bulkToggleItemsAction,
} from "@/app/_server/actions/data/actions";

interface UseChecklistProps {
  list: Checklist;
  onUpdate: (updatedChecklist: Checklist) => void;
  onDelete?: (deletedId: string) => void;
}

export function useChecklist({ list, onUpdate, onDelete }: UseChecklistProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showBulkPasteModal, setShowBulkPasteModal] = useState(false);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [localList, setLocalList] = useState(list);
  const [focusKey, setFocusKey] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLocalList(list);
    setFocusKey((prev) => prev + 1);
  }, [list]);

  const handleDeleteList = async () => {
    if (confirm("Are you sure you want to delete this checklist?")) {
      const formData = new FormData();
      formData.append("id", localList.id);
      formData.append("category", localList.category || "Uncategorized");
      await deleteListAction(formData);
      onDelete?.(localList.id);
    }
  };

  const handleToggleItem = async (itemId: string, completed: boolean) => {
    const formData = new FormData();
    formData.append("listId", localList.id);
    formData.append("itemId", itemId);
    formData.append("completed", String(completed));
    const result = await updateItemAction(formData);

    if (result.success && result.data) {
      setLocalList(result.data);
      onUpdate(result.data);
      setFocusKey((prev) => prev + 1);
    }
  };

  const handleEditItem = async (itemId: string, text: string, pluginData?: Record<string, any>) => {
    const formData = new FormData();
    formData.append("listId", localList.id);
    formData.append("itemId", itemId);
    formData.append("text", text);
    if (pluginData) {
      formData.append("pluginData", JSON.stringify(pluginData));
    }
    const result = await updateItemAction(formData);

    if (result.success) {
      const updatedList = {
        ...localList,
        items: localList.items.map((item) =>
          item.id === itemId ? {
            ...item,
            text,
            pluginData: pluginData || item.pluginData
          } : item
        ),
      };
      setLocalList(updatedList);
      onUpdate(updatedList);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    const optimisticList = {
      ...localList,
      items: localList.items.filter((item) => item.id !== itemId),
    };
    setLocalList(optimisticList);
    onUpdate(optimisticList);
    setFocusKey((prev) => prev + 1);

    const formData = new FormData();
    formData.append("listId", localList.id);
    formData.append("itemId", itemId);
    const result = await deleteItemAction(formData);

    if (!result.success) {
      setLocalList(localList);
      onUpdate(localList);
      console.error("Failed to delete item:", result.error);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
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
        ).map((item, index) => ({ ...item, order: index }));
        const newItems = [...newIncompleteItems, ...completedItems].map(
          (item, index) => ({ ...item, order: index })
        );

        const updatedList = {
          ...localList,
          items: newItems,
        };
        setLocalList(updatedList);

        const itemIds = newItems.map((item) => item.id);

        const formData = new FormData();
        formData.append("listId", localList.id);
        formData.append("itemIds", JSON.stringify(itemIds));
        formData.append("currentItems", JSON.stringify(newItems));
        const result = await reorderItemsAction(formData);

        if (!result.success) {
          setLocalList((prev) => ({
            ...prev,
            items: list.items,
          }));
        } else {
          onUpdate(updatedList);
        }
        return;
      }

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
        ).map((item, index) => ({ ...item, order: index }));
        const newItems = [...incompleteItems, ...newCompletedItems].map(
          (item, index) => ({ ...item, order: index })
        );

        const updatedList = {
          ...localList,
          items: newItems,
        };
        setLocalList(updatedList);

        const itemIds = newItems.map((item) => item.id);

        const formData = new FormData();
        formData.append("listId", localList.id);
        formData.append("itemIds", JSON.stringify(itemIds));
        formData.append("currentItems", JSON.stringify(newItems));
        const result = await reorderItemsAction(formData);

        if (!result.success) {
          setLocalList((prev) => ({
            ...prev,
            items: list.items,
          }));
        } else {
          onUpdate(updatedList);
        }
      }
    }
  };

  const handleBulkPaste = async (itemsText: string) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append("listId", localList.id);
    formData.append("itemsText", itemsText);
    const result = await createBulkItemsAction(formData);
    setIsLoading(false);

    if (result.success && result.data) {
      setLocalList(result.data);
      onUpdate(result.data);
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

    const result = await convertChecklistTypeAction(formData);
    setIsLoading(false);

    if (result.success && result.data) {
      setLocalList(result.data);
      onUpdate(result.data);
    }
  };

  const handleBulkToggle = async (completed: boolean) => {
    const targetItems = completed ? incompleteItems : completedItems;
    if (targetItems.length === 0) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append("listId", localList.id);
    formData.append("completed", String(completed));
    formData.append(
      "itemIds",
      JSON.stringify(targetItems.map((item) => item.id))
    );

    const result = await bulkToggleItemsAction(formData);
    setIsLoading(false);

    if (result.success && result.data) {
      setLocalList(result.data);
      onUpdate(result.data);
      setFocusKey((prev) => prev + 1);
    }
  };

  const handleCreateItem = async (text: string) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append("listId", localList.id);
    formData.append("text", text);

    // Add initial plugin data
    const pluginData = {
      'subtasks-and-labels': {
        subtasks: [],
        labels: [],
        expanded: false
      }
    };
    formData.append("pluginData", JSON.stringify(pluginData));

    const result = await createItemAction(formData);
    setIsLoading(false);

    if (result.success && result.data) {
      const newItem = {
        ...result.data,
        pluginData
      };
      const updatedList = {
        ...localList,
        items: [...localList.items, newItem],
      };
      setLocalList(updatedList);
      onUpdate(updatedList);
      setFocusKey((prev) => prev + 1);
    }
  };

  const handleCopyId = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(localList.id);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = localList.id;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy ID:", err);
    }
  };

  const incompleteItems = localList.items.filter((item) => !item.completed);
  const completedItems = localList.items.filter((item) => item.completed);
  const totalCount = localList.items.length;

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
    totalCount,
  };
}
