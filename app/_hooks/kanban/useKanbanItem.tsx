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
import { useToast } from "@/app/_providers/ToastProvider";

const TIMER_STORAGE_KEY = (checklistUuid: string, itemId: string) =>
  `jotty-timer-${checklistUuid}-${itemId}`;

const TIMER_SYNC_EVENT = "jotty-timer-sync";

interface UseKanbanItemProps {
  item: Item;
  checklist: Checklist;
  onUpdate: (updatedChecklist: Checklist) => void;
}

export const useKanbanItem = ({
  item,
  checklist,
  onUpdate,
}: UseKanbanItemProps) => {
  const checklistUuid = checklist.uuid || "";
  const t = useTranslations();
  const { showToast } = useToast();
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
    const storageKey = TIMER_STORAGE_KEY(checklistUuid, item.id);
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
  }, [checklistUuid, item.id]);

  useEffect(() => {
    const storageKey = TIMER_STORAGE_KEY(checklistUuid, item.id);
    if (isRunning && startTime) {
      localStorage.setItem(storageKey, JSON.stringify({
        startTime: startTime.toISOString(),
        isRunning: true,
      }));
    } else {
      localStorage.removeItem(storageKey);
    }
    // The same item can mount this hook twice at once (card + detail modal).
    // The "storage" event only fires across tabs, so broadcast in-tab too.
    window.dispatchEvent(
      new CustomEvent(TIMER_SYNC_EVENT, { detail: { key: storageKey } })
    );
  }, [isRunning, startTime, checklistUuid, item.id]);

  useEffect(() => {
    const storageKey = TIMER_STORAGE_KEY(checklistUuid, item.id);

    const _syncFromStorage = () => {
      let parsed: { startTime?: string; isRunning?: boolean } | null = null;
      try {
        const stored = localStorage.getItem(storageKey);
        parsed = stored ? JSON.parse(stored) : null;
      } catch {
        parsed = null;
      }

      if (parsed?.isRunning && parsed.startTime) {
        const storedStart = new Date(parsed.startTime);
        setStartTime((prev) =>
          prev?.getTime() === storedStart.getTime() ? prev : storedStart
        );
        setIsRunning((prev) => (prev ? prev : true));
        setCurrentTime(Math.floor((Date.now() - storedStart.getTime()) / 1000));
      } else {
        setIsRunning((prev) => (prev ? false : prev));
        setStartTime((prev) => (prev ? null : prev));
        setCurrentTime((prev) => (prev ? 0 : prev));
      }
    };

    const _handleStorage = (e: StorageEvent) => {
      if (e.key === storageKey) _syncFromStorage();
    };
    const _handleSync = (e: Event) => {
      if ((e as CustomEvent).detail?.key === storageKey) _syncFromStorage();
    };

    window.addEventListener("storage", _handleStorage);
    window.addEventListener(TIMER_SYNC_EVENT, _handleSync);
    return () => {
      window.removeEventListener("storage", _handleStorage);
      window.removeEventListener(TIMER_SYNC_EVENT, _handleSync);
    };
  }, [checklistUuid, item.id]);

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
    formData.append("uuid", checklistUuid);
    formData.append("itemId", item.id);
    formData.append("timeEntries", JSON.stringify(updatedTimeEntries));
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
    formData.append("uuid", checklistUuid);
    formData.append("itemId", item.id);
    formData.append(
      "timeEntries",
      JSON.stringify([...(item.timeEntries || []), newTimeEntry])
    );
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
      formData.append("uuid", checklistUuid);
      formData.append("itemId", item.id);
      formData.append("text", editText.trim());

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
    formData.append("uuid", checklistUuid);
    formData.append("itemId", item.id);
    formData.append("status", newStatus);
    const result = await updateItemStatus(formData);
    if (result.success && result.data) {
      onUpdate(result.data as Checklist);
      showToast({ type: "success", title: t("common.success"), message: t("kanban.statusUpdated") });
    }
  };

  const handlePriorityChange = async (priority: KanbanPriority) => {
    const formData = new FormData();
    formData.append("uuid", checklistUuid);
    formData.append("itemId", item.id);
    formData.append("priority", priority);
    const result = await updateItem(checklist, formData);
    if (result.success && result.data) {
      onUpdate(result.data as Checklist);
    }
  };

  const handleScoreChange = async (score: number) => {
    const formData = new FormData();
    formData.append("uuid", checklistUuid);
    formData.append("itemId", item.id);
    formData.append("score", score.toString());
    const result = await updateItem(checklist, formData);
    if (result.success && result.data) {
      onUpdate(result.data as Checklist);
    }
  };

  const handleAssigneeChange = async (assignee: string) => {
    const formData = new FormData();
    formData.append("uuid", checklistUuid);
    formData.append("itemId", item.id);
    formData.append("assignee", assignee);
    const result = await updateItem(checklist, formData);
    if (result.success && result.data) {
      onUpdate(result.data as Checklist);
    }
  };

  const handleReminderSet = async (reminder: KanbanReminder | null) => {
    const formData = new FormData();
    formData.append("uuid", checklistUuid);
    formData.append("itemId", item.id);
    formData.append("reminder", reminder ? JSON.stringify(reminder) : "");
    const result = await updateItem(checklist, formData);
    if (result.success && result.data) {
      onUpdate(result.data as Checklist);
    }
  };

  const _confirmDelete = async () => {
    const formData = new FormData();
    formData.append("uuid", checklistUuid);
    formData.append("itemId", item.id);

    const result = await deleteItem(formData);
    if (result.success) {
      showToast({ type: "success", title: t("common.success"), message: t("kanban.itemDeleted") });
      onUpdate({
        id: checklist.id,
        uuid: checklist.uuid,
        title: "",
        type: "kanban",
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        category: checklist.category,
        isDeleted: true,
      });
    }
    setShowDeleteModal(false);
  };

  const handleArchive = async () => {
    const formData = new FormData();
    formData.append("uuid", checklistUuid);
    formData.append("itemId", item.id);

    const result = await archiveItem(formData);
    if (result.success && result.data) {
      onUpdate(result.data as Checklist);
      showToast({ type: "success", title: t("common.success"), message: t("kanban.itemArchived") });
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
