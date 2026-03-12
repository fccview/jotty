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
} from "@/app/_server/actions/checklist-item";
import { createNotificationForUser } from "@/app/_server/actions/notifications";
import { getUsersWithAccess } from "@/app/_server/actions/sharing";
import { getUsers } from "@/app/_server/actions/users";
import { FloppyDiskIcon, MultiplicationSignIcon } from "hugeicons-react";
import { convertMarkdownToHtml } from "@/app/_utils/markdown-utils";
import { usePermissions } from "@/app/_providers/PermissionsProvider";
import { usePreferredDateTime } from "@/app/_hooks/usePreferredDateTime";
import { useTranslations } from "next-intl";
import { KanbanPriorityLevel } from "@/app/_types/enums";
import { KanbanCardDetailProperties } from "./KanbanCardDetailProperties";
import { KanbanCardDetailSubtasks } from "./KanbanCardDetailSubtasks";

interface KanbanCardDetailProps {
  checklist: Checklist;
  item: Item;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedChecklist: Checklist) => void;
  checklistId: string;
  category: string;
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
  checklistId,
  category,
}: KanbanCardDetailProps) => {
  const t = useTranslations();
  const { permissions } = usePermissions();
  const { formatDateTimeString } = usePreferredDateTime();

  const [item, setItem] = useState(initialItem);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(initialItem.text);
  const [editDescription, setEditDescription] = useState(_unsanitizeDescription(initialItem.description || ""));
  const [scoreInput, setScoreInput] = useState(initialItem.score?.toString() || "");
  const [reminderInput, setReminderInput] = useState(initialItem.reminder?.datetime || "");
  const [targetDateInput, setTargetDateInput] = useState(initialItem.targetDate || "");
  const [priorityInput, setPriorityInput] = useState<KanbanPriority>(initialItem.priority || KanbanPriorityLevel.NONE);
  const [assigneeInput, setAssigneeInput] = useState(initialItem.assignee || "");
  const [availableUsers, setAvailableUsers] = useState<{ username: string; avatarUrl?: string }[]>([]);

  useEffect(() => {
    setItem(initialItem);
    setEditText(initialItem.text);
    setEditDescription(_unsanitizeDescription(initialItem.description || ""));
    setScoreInput(initialItem.score?.toString() || "");
    setReminderInput(initialItem.reminder?.datetime || "");
    setTargetDateInput(initialItem.targetDate || "");
    setPriorityInput(initialItem.priority || KanbanPriorityLevel.NONE);
    setAssigneeInput(initialItem.assignee || "");
  }, [initialItem]);

  useEffect(() => {
    if (!isOpen) return;
    const _loadUsers = async () => {
      const allUsers = await getUsers();
      const sharedWithUsers = await getUsersWithAccess(checklistId, checklist.uuid);
      const userMap = new Map<string, { username: string; avatarUrl?: string }>();
      allUsers.forEach((u: { username: string; avatarUrl?: string }) => {
        userMap.set(u.username, { username: u.username, avatarUrl: u.avatarUrl });
      });
      sharedWithUsers.forEach((username: string) => {
        if (!userMap.has(username)) userMap.set(username, { username });
      });
      if (checklist.owner && !userMap.has(checklist.owner)) {
        userMap.set(checklist.owner, { username: checklist.owner });
      }
      setAvailableUsers(Array.from(userMap.values()));
    };
    _loadUsers();
  }, [isOpen, checklistId, checklist.uuid, checklist.owner]);

  const descriptionHtml = useMemo(() => {
    const noDescText = `<p class="text-muted-foreground text-sm opacity-50">${t("checklists.noDescription")}</p>`;
    if (!item.description) return noDescText;
    const unsanitized = _unsanitizeDescription(item.description);
    return convertMarkdownToHtml(unsanitized.replace(/\n/g, "  \n")) || noDescText;
  }, [item.description, t]);

  const _saveField = async (fields: Record<string, string>) => {
    const formData = new FormData();
    formData.append("listId", checklistId);
    formData.append("itemId", item.id);
    formData.append("category", category);
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
      formData.append("listId", checklistId);
      formData.append("itemId", item.id);
      formData.append("text", editText.trim());
      formData.append("description", sanitizedDescription);
      formData.append("category", category);
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
    formData.append("listId", checklistId);
    formData.append("parentId", item.id);
    formData.append("text", text);
    formData.append("category", category);
    const result = await createSubItem(formData);
    if (result.success && result.data) {
      onUpdate(result.data);
      const updatedItem = _findItemInChecklist(result.data, item.id);
      if (updatedItem) setItem(updatedItem);
    }
  };

  const handleAddNestedSubtask = async (parentId: string, text: string) => {
    const formData = new FormData();
    formData.append("listId", checklistId);
    formData.append("parentId", parentId);
    formData.append("text", text);
    formData.append("category", category);
    const result = await createSubItem(formData);
    if (result.success && result.data) {
      onUpdate(result.data);
      const updatedItem = _findItemInChecklist(result.data, item.id);
      if (updatedItem) setItem(updatedItem);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    const formData = new FormData();
    formData.append("listId", checklistId);
    formData.append("itemId", subtaskId);
    formData.append("completed", completed.toString());
    formData.append("category", category);
    const result = await updateItem(checklist, formData);
    if (result.success && result.data) {
      onUpdate(result.data);
      const updatedItem = _findItemInChecklist(result.data, item.id);
      if (updatedItem) setItem(updatedItem);
    }
  };

  const handleEditSubtask = async (subtaskId: string, text: string) => {
    const formData = new FormData();
    formData.append("listId", checklistId);
    formData.append("itemId", subtaskId);
    formData.append("text", text);
    formData.append("category", category);
    const result = await updateItem(checklist, formData);
    if (result.success && result.data) {
      onUpdate(result.data);
      const updatedItem = _findItemInChecklist(result.data, item.id);
      if (updatedItem) setItem(updatedItem);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    const formData = new FormData();
    formData.append("listId", checklistId);
    formData.append("itemId", subtaskId);
    formData.append("category", category);
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
    formData.append("listId", checklistId);
    formData.append("completed", String(completed));
    formData.append("itemIds", JSON.stringify(targetItems.map((t) => t.id)));
    formData.append("category", category);
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

  const handleTargetDateChange = async (value: string) => {
    setTargetDateInput(value);
    await _saveField({ targetDate: value ? new Date(value).toISOString() : "" });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={item.text || t("checklists.untitledTask")}
      className="lg:!max-w-[80vw] lg:!w-full lg:!h-[80vh] !max-h-[80vh] overflow-y-auto"
    >
      <div className="flex flex-col lg:flex-row gap-6 min-h-0">
        <div className="flex-1 min-w-0 space-y-4 overflow-y-auto">
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

        <div className="lg:w-64 lg:flex-shrink-0 lg:border-l lg:border-border lg:pl-6">
          <KanbanCardDetailProperties
            item={item}
            priorityInput={priorityInput}
            scoreInput={scoreInput}
            assigneeInput={assigneeInput}
            reminderInput={reminderInput}
            targetDateInput={targetDateInput}
            availableUsers={availableUsers}
            canEdit={!!permissions?.canEdit}
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
                    itemId: checklist.uuid || checklistId,
                    itemType: "checklist",
                    taskId: item.id,
                  },
                });
              }
            }}
            onReminderChange={setReminderInput}
            onReminderSave={handleReminderSave}
            onTargetDateChange={handleTargetDateChange}
            formatDateTimeString={formatDateTimeString}
          />
        </div>
      </div>
    </Modal>
  );
};
