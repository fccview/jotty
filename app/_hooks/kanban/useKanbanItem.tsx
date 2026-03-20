"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Item, Checklist, KanbanPriority, KanbanReminder } from "@/app/_types";
import {
  updateItem,
  deleteItem,
  updateItemStatus,
  archiveItem,
} from "@/app/_server/actions/checklist-item";
import { ConfirmModal } from "@/app/_components/GlobalComponents/Modals/ConfirmationModals/ConfirmModal";

const TIMER_STORAGE_KEY = (checklistId: string, itemId: string) =>
  `jotty-timer-${checklistId}-${itemId}`;

interface UseKanbanItemProps {
  item: Item;
  checklist: Checklist;
  checklistId: string;
  category: string;
  onUpdate: (updatedChecklist: Checklist) => void;
}

export const useKanbanItem = ({
  item,
  checklist,
  checklistId,
  category,
  onUpdate,
}: UseKanbanItemProps) => {
  const t = useTranslations();
  const [isRunning, setIsRunning] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [totalTime, setTotalTime] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const existingTime =
      item.timeEntries?.reduce((total, entry) => {
        if (entry.endTime) {
          const start = new Date(entry.startTime).getTime();
          const end = new Date(entry.endTime).getTime();
          return total + (end - start);
        }
        return total;
      }, 0) || 0;
    setTotalTime(Math.floor(existingTime / 1000));
  }, [item.timeEntries]);

  useEffect(() => {
    const storageKey = TIMER_STORAGE_KEY(checklistId, item.id);
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const { startTime: storedStart, isRunning: storedRunning } = JSON.parse(stored);
        if (storedRunning && storedStart) {
          setStartTime(new Date(storedStart));
          setIsRunning(true);
          setCurrentTime(Math.floor((Date.now() - new Date(storedStart).getTime()) / 1000));
        }
      }
    } catch {}
  }, [checklistId, item.id]);

  useEffect(() => {
    const storageKey = TIMER_STORAGE_KEY(checklistId, item.id);
    if (isRunning && startTime) {
      localStorage.setItem(storageKey, JSON.stringify({
        startTime: startTime.toISOString(),
        isRunning: true,
      }));
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [isRunning, startTime, checklistId, item.id]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && startTime) {
      interval = setInterval(() => {
        setCurrentTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const _saveTimerEntry = async (start: Date, end: Date) => {
    const newTimeEntry = {
      id: Date.now().toString(),
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      duration: Math.floor((end.getTime() - start.getTime()) / 1000),
    };

    const updatedTimeEntries = [...(item.timeEntries || []), newTimeEntry];
    const formData = new FormData();
    formData.append("listId", checklistId);
    formData.append("itemId", item.id);
    formData.append("timeEntries", JSON.stringify(updatedTimeEntries));
    formData.append("category", category);
    const result = await updateItemStatus(formData);

    setTotalTime(
      (prev) => prev + Math.floor((end.getTime() - start.getTime()) / 1000)
    );

    if (result.success && result.data) {
      onUpdate(result.data as Checklist);
    }

    return result;
  };

  function handleTimerToggle() {
    if (isRunning) {
      setIsRunning(false);
      if (startTime) {
        const endTime = new Date();
        _saveTimerEntry(startTime, endTime);
      }
      setStartTime(null);
      setCurrentTime(0);
    } else {
      setIsRunning(true);
      setStartTime(new Date());
      setCurrentTime(0);
    }
  }

  const handleAddManualTime = async (minutes: number) => {
    const now = new Date();
    const start = new Date(now.getTime() - minutes * 60000);
    const newTimeEntry = {
      id: Date.now().toString(),
      startTime: start.toISOString(),
      endTime: now.toISOString(),
      duration: minutes * 60,
    };
    const formData = new FormData();
    formData.append("listId", checklistId);
    formData.append("itemId", item.id);
    formData.append(
      "timeEntries",
      JSON.stringify([...(item.timeEntries || []), newTimeEntry])
    );
    formData.append("category", category);
    const result = await updateItemStatus(formData);
    if (result.success && result.data) {
      onUpdate(result.data as Checklist);
    }
  };

  const stopTimerOnDrag = async () => {
    if (isRunning && startTime) {
      const endTime = new Date();
      await _saveTimerEntry(startTime, endTime);
      setIsRunning(false);
      setStartTime(null);
      setCurrentTime(0);
    }
  };

  function handleEdit() {
    setIsEditing(true);
    setEditText(item.text);
  }

  const handleSave = async () => {
    setIsEditing(false);
    if (editText.trim() && editText !== item.text) {
      const formData = new FormData();
      formData.append("listId", checklistId);
      formData.append("itemId", item.id);
      formData.append("text", editText.trim());
      formData.append("category", category || "Uncategorized");

      const result = await updateItem(checklist, formData);
      if (result.success && result.data) {
        onUpdate(result.data as Checklist);
      }
    }
  };

  function handleCancel() {
    setEditText(item.text);
    setIsEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      handleCancel();
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    const formData = new FormData();
    formData.append("listId", checklistId);
    formData.append("itemId", item.id);
    formData.append("status", newStatus);
    formData.append("category", category || "Uncategorized");
    const result = await updateItemStatus(formData);
    if (result.success && result.data) {
      onUpdate(result.data as Checklist);
    }
  };

  const handlePriorityChange = async (priority: KanbanPriority) => {
    const formData = new FormData();
    formData.append("listId", checklistId);
    formData.append("itemId", item.id);
    formData.append("priority", priority);
    formData.append("category", category || "Uncategorized");
    const result = await updateItem(checklist, formData);
    if (result.success && result.data) {
      onUpdate(result.data as Checklist);
    }
  };

  const handleScoreChange = async (score: number) => {
    const formData = new FormData();
    formData.append("listId", checklistId);
    formData.append("itemId", item.id);
    formData.append("score", score.toString());
    formData.append("category", category || "Uncategorized");
    const result = await updateItem(checklist, formData);
    if (result.success && result.data) {
      onUpdate(result.data as Checklist);
    }
  };

  const handleAssigneeChange = async (assignee: string) => {
    const formData = new FormData();
    formData.append("listId", checklistId);
    formData.append("itemId", item.id);
    formData.append("assignee", assignee);
    formData.append("category", category || "Uncategorized");
    const result = await updateItem(checklist, formData);
    if (result.success && result.data) {
      onUpdate(result.data as Checklist);
    }
  };

  const handleReminderSet = async (reminder: KanbanReminder | null) => {
    const formData = new FormData();
    formData.append("listId", checklistId);
    formData.append("itemId", item.id);
    formData.append("reminder", reminder ? JSON.stringify(reminder) : "");
    formData.append("category", category || "Uncategorized");
    const result = await updateItem(checklist, formData);
    if (result.success && result.data) {
      onUpdate(result.data as Checklist);
    }
  };

  const _confirmDelete = async () => {
    const formData = new FormData();
    formData.append("listId", checklistId);
    formData.append("itemId", item.id);
    formData.append("category", category || "Uncategorized");

    const result = await deleteItem(formData);
    if (result.success) {
      onUpdate({
        id: checklistId,
        title: "",
        type: "kanban",
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        category,
        isDeleted: true,
      });
    }
    setShowDeleteModal(false);
  };

  const handleArchive = async () => {
    const formData = new FormData();
    formData.append("listId", checklistId);
    formData.append("itemId", item.id);
    formData.append("category", category || "Uncategorized");

    const result = await archiveItem(formData);
    if (result.success && result.data) {
      onUpdate(result.data as Checklist);
    }
  };

  return {
    isRunning,
    currentTime,
    totalTime,
    handleTimerToggle,
    handleAddManualTime,
    stopTimerOnDrag,
    isEditing,
    editText,
    setEditText,
    inputRef,
    handleEdit,
    handleSave,
    handleCancel,
    handleKeyDown,
    handleStatusChange,
    handlePriorityChange,
    handleScoreChange,
    handleAssigneeChange,
    handleReminderSet,
    handleDelete: () => setShowDeleteModal(true),
    handleArchive,
    DeleteModal: () => (
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={_confirmDelete}
        title={t("common.delete")}
        message={t("common.confirmDeleteItem", { itemTitle: item.text })}
        confirmText={t("common.delete")}
        variant="destructive"
      />
    ),
  };
};
