"use client";

import { useState, useEffect, useMemo } from "react";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Item, Checklist, KanbanPriority } from "@/app/_types";
import {
  createSubItem,
  updateItem,
  deleteItem,
  bulkToggleItems,
  updateItemStatus,
} from "@/app/_server/actions/checklist-item";
import { createNotificationForUser } from "@/app/_server/actions/notifications";
import { getUsersWithAccess } from "@/app/_server/actions/sharing";
import { getUsers } from "@/app/_server/actions/users";
import { FloppyDiskIcon, MultiplicationSignIcon, ArrowDown01Icon, ArrowRight01Icon } from "hugeicons-react";
import { convertMarkdownToHtml } from "@/app/_utils/markdown-utils";
import { usePermissions } from "@/app/_providers/PermissionsProvider";
import { usePreferredDateTime } from "@/app/_hooks/usePreferredDateTime";
import { useTranslations } from "next-intl";
import { KanbanPriorityLevel } from "@/app/_types/enums";
import { KanbanCardDetailProperties } from "./KanbanCardDetailProperties";
import { KanbanCardDetailSubtasks } from "./KanbanCardDetailSubtasks";
import { KanbanItemTimer } from "./KanbanItemTimer";
import { TimeEntriesAccordion } from "./TimeEntriesAccordion";
import { TimeEntriesModal } from "./TimeEntriesModal";
import { useKanbanItem } from "@/app/_hooks/kanban/useKanbanItem";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { formatTimerTime } from "@/app/_utils/kanban/index";
import { DEFAULT_KANBAN_STATUSES } from "@/app/_consts/kanban";

interface KanbanCardDetailProps {
  checklist: Checklist;
  item: Item;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedChecklist: Checklist) => void;
}

const _sanitizeDescription = (text: string): string => text.replace(/\n/g, "\\n");
const _unsanitizeDescription = (text: string): string => text.replace(/\\n/g, "\n");

const _toLocalDateTimeValue = (isoStr: string): string => {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const _toLocalDateValue = (isoStr: string): string => {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const _findItemInChecklist = (checklist: Checklist, itemId: string): Item | null => {
  const search = (items: Item[]): Item | null => {
    for (const item of items) {
      if (item.id === itemId) return item;
      if (item.children) {
        const found = search(item.children);
        if (found) return found;
      }
    }
    return null;
  };
  return search(checklist.items);
};

export const KanbanCardDetail = ({
  checklist,
  item: initialItem,
  isOpen,
  onClose,
  onUpdate,
}: KanbanCardDetailProps) => {
  const checklistUuid = checklist.uuid || "";
  const t = useTranslations();
  const { permissions } = usePermissions();
  const { usersPublicData } = useAppMode();
  const { formatDateTimeString, formatDateString, formatTimeString } =
    usePreferredDateTime();
  const statuses = checklist.statuses || DEFAULT_KANBAN_STATUSES;
  const defaultStatusId =
    [...statuses].sort((a, b) => a.order - b.order)[0]?.id || "";

  const [showHistory, setShowHistory] = useState(false);
  const [item, setItem] = useState(initialItem);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(initialItem.text);
  const [editDescription, setEditDescription] = useState(_unsanitizeDescription(initialItem.description || ""));
  const [scoreInput, setScoreInput] = useState(initialItem.score?.toString() || "");
  const [reminderInput, setReminderInput] = useState(initialItem.reminder?.datetime || "");
  const [targetDateInput, setTargetDateInput] = useState(initialItem.targetDate || "");
  const [startDateInput, setStartDateInput] = useState(initialItem.startDate || "");
  const [priorityInput, setPriorityInput] = useState<KanbanPriority>(initialItem.priority || KanbanPriorityLevel.NONE);
  const [statusInput, setStatusInput] = useState(initialItem.status || defaultStatusId);
  const [assigneeInput, setAssigneeInput] = useState(initialItem.assignee || "");
  const [estimatedTimeInput, setEstimatedTimeInput] = useState(initialItem.estimatedTime?.toString() || "");
  const [availableUsers, setAvailableUsers] = useState<{ username: string; avatarUrl?: string }[]>([]);
  const [boardIsShared, setBoardIsShared] = useState(false);
  const [showTimeEntriesModal, setShowTimeEntriesModal] = useState(false);

  const kanbanItemHook = useKanbanItem({
    checklist,
    item,
    onUpdate,
  });

  useEffect(() => {
    setItem(initialItem);
    setEditText(initialItem.text);
    setEditDescription(_unsanitizeDescription(initialItem.description || ""));
    setScoreInput(initialItem.score?.toString() || "");
    setReminderInput(initialItem.reminder?.datetime || "");
    setTargetDateInput(initialItem.targetDate || "");
    setStartDateInput(initialItem.startDate || "");
    setPriorityInput(initialItem.priority || KanbanPriorityLevel.NONE);
    setStatusInput(initialItem.status || defaultStatusId);
    setAssigneeInput(initialItem.assignee || "");
    setEstimatedTimeInput(initialItem.estimatedTime?.toString() || "");
  }, [initialItem, defaultStatusId]);

  useEffect(() => {
    if (!isOpen) return;
    const _loadUsers = async () => {
      const sharedWithUsers = await getUsersWithAccess(checklistUuid);
      if (sharedWithUsers.length === 0) {
        setBoardIsShared(false);
        return;
      }
      setBoardIsShared(true);
      const allUsers = await getUsers();
      const allowedUsernames = new Set(sharedWithUsers);
      if (checklist.owner) allowedUsernames.add(checklist.owner);
      const userMap = new Map<string, { username: string; avatarUrl?: string }>();
      allUsers
        .filter((u: { username: string }) => allowedUsernames.has(u.username))
        .forEach((u: { username: string; avatarUrl?: string }) => {
          userMap.set(u.username, { username: u.username, avatarUrl: u.avatarUrl });
        });
      allowedUsernames.forEach((username) => {
        if (!userMap.has(username)) userMap.set(username, { username });
      });
      setAvailableUsers(Array.from(userMap.values()));
    };
    _loadUsers();
  }, [isOpen, checklistUuid, checklist.owner]);

  const descriptionHtml = useMemo(() => {
    const noDescText = `<p class="text-muted-foreground text-sm opacity-50">${t("checklists.noDescription")}</p>`;
    if (!item.description) return noDescText;
    const unsanitized = _unsanitizeDescription(item.description);
    return convertMarkdownToHtml(unsanitized.replace(/\n/g, "  \n")) || noDescText;
  }, [item.description, t]);

  const _saveField = async (fields: Record<string, string>) => {
    const formData = new FormData();
    formData.append("uuid", checklistUuid);
    formData.append("itemId", item.id);
    Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
    const result = await updateItem(checklist, formData);
    if (result.success && result.data) {
      onUpdate(result.data);
      const updatedItem = _findItemInChecklist(result.data, item.id);
      if (updatedItem) setItem(updatedItem);
    }
  };

  const handleSave = async () => {
    const sanitizedDescription = _sanitizeDescription(editDescription.trim());
    const currentUnsanitized = _unsanitizeDescription(item.description || "");
    if (editText.trim() !== item.text || editDescription.trim() !== currentUnsanitized) {
      const formData = new FormData();
      formData.append("uuid", checklistUuid);
      formData.append("itemId", item.id);
      formData.append("text", editText.trim());
      formData.append("description", sanitizedDescription);
        const result = await updateItem(checklist, formData);
      if (result.success && result.data) {
        onUpdate(result.data);
        const updatedItem = _findItemInChecklist(result.data, item.id);
        if (updatedItem) {
          setItem(updatedItem);
          setEditText(updatedItem.text);
          setEditDescription(_unsanitizeDescription(updatedItem.description || ""));
        }
      }
    }
    setIsEditing(false);
  };

  const handleAddSubtask = async (text: string) => {
    const formData = new FormData();
    formData.append("uuid", checklistUuid);
    formData.append("parentId", item.id);
    formData.append("text", text);
    const result = await createSubItem(formData);
    if (result.success && result.data) {
      onUpdate(result.data);
      const updatedItem = _findItemInChecklist(result.data, item.id);
      if (updatedItem) setItem(updatedItem);
    }
  };

  const handleAddNestedSubtask = async (parentId: string, text: string) => {
    const formData = new FormData();
    formData.append("uuid", checklistUuid);
    formData.append("parentId", parentId);
    formData.append("text", text);
    const result = await createSubItem(formData);
    if (result.success && result.data) {
      onUpdate(result.data);
      const updatedItem = _findItemInChecklist(result.data, item.id);
      if (updatedItem) setItem(updatedItem);
    }
  };

  const _allChildrenComplete = (children: Item[]): boolean =>
    children.every((child) =>
      child.completed && (!child.children?.length || _allChildrenComplete(child.children))
    );

  const _autoCompleteStatus = useMemo(() => {
    const statuses = checklist.statuses || [];
    return statuses.find((s) => s.autoComplete);
  }, [checklist.statuses]);

  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    const formData = new FormData();
    formData.append("uuid", checklistUuid);
    formData.append("itemId", subtaskId);
    formData.append("completed", completed.toString());
    const result = await updateItem(checklist, formData);
    if (result.success && result.data) {
      onUpdate(result.data);
      const updatedItem = _findItemInChecklist(result.data, item.id);
      if (updatedItem) {
        setItem(updatedItem);
        if (_autoCompleteStatus && updatedItem.children?.length && _allChildrenComplete(updatedItem.children)) {
          const statusFormData = new FormData();
          statusFormData.append("uuid", checklistUuid);
          statusFormData.append("itemId", item.id);
          statusFormData.append("status", _autoCompleteStatus.id);
          const statusResult = await updateItemStatus(statusFormData);
          if (statusResult.success && statusResult.data) {
            onUpdate(statusResult.data as import("@/app/_types").Checklist);
          }
        }
      }
    }
  };

  const handleEditSubtask = async (subtaskId: string, text: string) => {
    const formData = new FormData();
    formData.append("uuid", checklistUuid);
    formData.append("itemId", subtaskId);
    formData.append("text", text);
    const result = await updateItem(checklist, formData);
    if (result.success && result.data) {
      onUpdate(result.data);
      const updatedItem = _findItemInChecklist(result.data, item.id);
      if (updatedItem) setItem(updatedItem);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    const formData = new FormData();
    formData.append("uuid", checklistUuid);
    formData.append("itemId", subtaskId);
    const result = await deleteItem(formData);
    if (result.success && result.data) {
      onUpdate(result.data);
      const updatedItem = _findItemInChecklist(result.data, item.id);
      if (updatedItem) setItem(updatedItem);
    }
  };

  const handleToggleAll = async (completed: boolean) => {
    if (!item.children?.length) return;
    const _findTargetItems = (items: Item[]): Item[] => {
      const targets: Item[] = [];
      items.forEach((subtask) => {
        const shouldToggle = completed ? !subtask.completed : subtask.completed;
        if (shouldToggle) targets.push(subtask);
        if (subtask.children?.length) targets.push(..._findTargetItems(subtask.children));
      });
      return targets;
    };
    const targetItems = _findTargetItems(item.children);
    if (!targetItems.length) return;
    const formData = new FormData();
    formData.append("uuid", checklistUuid);
    formData.append("completed", String(completed));
    formData.append("itemIds", JSON.stringify(targetItems.map((t) => t.id)));
    const result = await bulkToggleItems(formData);
    if (result.success && result.data) {
      onUpdate(result.data);
      const updatedItem = _findItemInChecklist(result.data, item.id);
      if (updatedItem) setItem(updatedItem);
    }
  };

  const handlePriorityChange = async (priority: KanbanPriority) => {
    setPriorityInput(priority);
    await _saveField({ priority });
  };

  const handleStatusChange = async (status: string) => {
    setStatusInput(status);
    const formData = new FormData();
    formData.append("uuid", checklistUuid);
    formData.append("itemId", item.id);
    formData.append("status", status);
    const result = await updateItemStatus(formData);
    if (result.success && result.data) {
      onUpdate(result.data);
      const updatedItem = _findItemInChecklist(result.data, item.id);
      if (updatedItem) {
        setItem(updatedItem);
        setStatusInput(updatedItem.status || status);
      }
    }
  };

  const handleScoreSave = async () => {
    const score = parseInt(scoreInput);
    if (isNaN(score)) return;
    await _saveField({ score: score.toString() });
  };

  const handleReminderSave = async () => {
    await _saveField({
      reminder: reminderInput ? JSON.stringify({ datetime: new Date(reminderInput).toISOString() }) : "",
    });
  };

  const _dateKey = (value: string): string =>
    value.includes("T") ? _toLocalDateValue(value) : value;

  const _dateToIso = (value: string): string =>
    value
      ? new Date(value.includes("T") ? value : `${value}T00:00:00`).toISOString()
      : "";

  const handleStartDateChange = async (value: string) => {
    const iso = _dateToIso(value);
    setStartDateInput(iso);
    const targetKey = _dateKey(targetDateInput);
    if (value && targetKey && value > targetKey) {
      setTargetDateInput(iso);
      await _saveField({ startDate: iso, targetDate: iso });
      return;
    }
    await _saveField({ startDate: iso });
  };

  const handleTargetDateChange = async (value: string) => {
    const iso = _dateToIso(value);
    setTargetDateInput(iso);
    if (!value) {
      await _saveField({ targetDate: "" });
      return;
    }
    const startKey = _dateKey(startDateInput);
    if (startKey && startKey > value) {
      setStartDateInput(iso);
      await _saveField({ targetDate: iso, startDate: iso });
      return;
    }
    await _saveField({ targetDate: iso });
  };

  const handleEstimatedTimeSave = async () => {
    const hours = parseFloat(estimatedTimeInput);
    if (isNaN(hours)) return;
    await _saveField({ estimatedTime: hours.toString() });
  };

  const timeTrackingContent = (
    <div className="space-y-2">
      <KanbanItemTimer
        totalTime={kanbanItemHook.totalTime}
        currentTime={kanbanItemHook.currentTime}
        isRunning={kanbanItemHook.isRunning}
        formatTimerTime={formatTimerTime}
        onTimerToggle={kanbanItemHook.handleTimerToggle}
        onAddManualTime={kanbanItemHook.handleAddManualTime}
      />
      {item.timeEntries && item.timeEntries.length > 0 && (
        <TimeEntriesAccordion
          timeEntries={item.timeEntries}
          totalTime={kanbanItemHook.totalTime + kanbanItemHook.currentTime}
          formatTimerTime={formatTimerTime}
          usersPublicData={usersPublicData}
          formatDateString={formatDateString}
          formatTimeString={formatTimeString}
          onOpenTimeEntries={() => setShowTimeEntriesModal(true)}
        />
      )}
    </div>
  );

  return (
    <>
      {showTimeEntriesModal && item.timeEntries && (
        <TimeEntriesModal
          isOpen={showTimeEntriesModal}
          onClose={() => setShowTimeEntriesModal(false)}
          timeEntries={item.timeEntries}
          checklistUuid={checklistUuid}
          itemId={item.id}
          onUpdate={onUpdate}
          usersPublicData={usersPublicData}
        />
      )}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={item.text || t("checklists.untitledTask")}
        size="fullscreen"
        allowEnlarge
        defaultEnlarged
        className="lg:!max-w-[80vw] lg:!w-full lg:!h-[80vh] lg:!max-h-[80vh] max-h-[min(90dvh,100dvh)]"
      >
      <div className="kanban-card-detail-body flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:overflow-hidden">
        <div className="min-w-0 space-y-4 p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t("kanban.itemTitle")}
                </label>
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-jotty focus:outline-none focus:border-ring transition-all text-base"
                  placeholder={t("checklists.enterTaskTitle")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); }
                    else if (e.key === "Escape") { e.preventDefault(); setEditText(item.text); setEditDescription(_unsanitizeDescription(item.description || "")); setIsEditing(false); }
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t("common.description")}
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-jotty focus:outline-none focus:border-ring transition-all min-h-[120px] text-base resize-y"
                  placeholder={t("checklists.addDescriptionOptional")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); handleSave(); }
                    else if (e.key === "Escape") { e.preventDefault(); setEditText(item.text); setEditDescription(_unsanitizeDescription(item.description || "")); setIsEditing(false); }
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => { setEditText(item.text); setEditDescription(_unsanitizeDescription(item.description || "")); setIsEditing(false); }}>
                  <MultiplicationSignIcon className="h-4 w-4 mr-2" />
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleSave}>
                  <FloppyDiskIcon className="h-4 w-4 mr-2" />
                  {t("admin.saveChanges")}
                </Button>
              </div>
            </div>
          ) : (
            <div
              className={`bg-card border border-border rounded-jotty p-4 shadow-sm ${permissions?.canEdit ? "cursor-pointer" : ""}`}
              onClick={() => permissions?.canEdit && setIsEditing(true)}
            >
              <div
                className="text-card-foreground prose prose-sm dark:prose-invert max-w-none leading-relaxed"
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            </div>
          )}

          {!isEditing && item.history && item.history.length > 0 && (
            <div className="border-t border-border pt-4">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
              >
                {showHistory ? (
                  <ArrowDown01Icon className="h-4 w-4" />
                ) : (
                  <ArrowRight01Icon className="h-4 w-4" />
                )}
                {t("common.statusChanges", { count: item.history.length })}
              </button>
              {showHistory && (
                <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                  {item.history.map((change, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-jotty px-3 py-2"
                    >
                      <span className="font-medium text-foreground">{change.status}</span>
                      <span className="text-muted-foreground/50">&bull;</span>
                      <span>{change.user}</span>
                      <span className="text-muted-foreground/50">&bull;</span>
                      <span>{formatDateTimeString(change.timestamp)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!isEditing && (
            <div className="border-t border-border pt-4">
              <KanbanCardDetailSubtasks
                item={item}
                checklist={checklist}
                canEdit={!!permissions?.canEdit}
                onToggle={handleToggleSubtask}
                onEdit={handleEditSubtask}
                onDelete={handleDeleteSubtask}
                onAddSubtask={handleAddSubtask}
                onAddNestedSubtask={handleAddNestedSubtask}
                onToggleAll={handleToggleAll}
              />
            </div>
          )}
        </div>

        <div className="overflow-y-auto p-4 lg:min-h-0 lg:w-80 lg:flex-shrink-0 lg:border-l lg:border-border lg:pl-6">
          <KanbanCardDetailProperties
            item={item}
            statuses={statuses}
            statusInput={statusInput}
            priorityInput={priorityInput}
            scoreInput={scoreInput}
            assigneeInput={assigneeInput}
            reminderInput={reminderInput}
            targetDateInput={targetDateInput}
            startDateInput={startDateInput}
            estimatedTimeInput={estimatedTimeInput}
            availableUsers={availableUsers}
            canEdit={!!permissions?.canEdit}
            isShared={boardIsShared}
            toLocalDateTimeValue={_toLocalDateTimeValue}
            toLocalDateValue={_toLocalDateValue}
            onPriorityChange={handlePriorityChange}
            onScoreChange={setScoreInput}
            onScoreSave={handleScoreSave}
            onAssigneeChange={async (v) => {
              setAssigneeInput(v);
              await _saveField({ assignee: v });
              if (v) {
                await createNotificationForUser(v, {
                  type: "assignment",
                  title: t("notifications.assignmentTitle"),
                  message: t("notifications.assignmentMessage", { task: item.text, board: checklist.title }),
                  data: {
                    itemId: checklistUuid,
                    itemType: "checklist",
                    taskId: item.id,
                  },
                });
              }
            }}
            onReminderChange={async (v) => {
              setReminderInput(v);
              await _saveField({
                reminder: v ? JSON.stringify({ datetime: new Date(v).toISOString() }) : "",
              });
            }}
            onReminderSave={handleReminderSave}
            onTargetDateChange={handleTargetDateChange}
            onStartDateChange={handleStartDateChange}
            onEstimatedTimeChange={setEstimatedTimeInput}
            onEstimatedTimeSave={handleEstimatedTimeSave}
            formatDateTimeString={formatDateTimeString}
            onStatusChange={handleStatusChange}
            timeTracking={timeTrackingContent}
          />
        </div>
      </div>
      </Modal>
    </>
  );
};
