"use client";

import { useState, useEffect, useMemo } from "react";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import { Item, Checklist, KanbanPriority } from "@/app/_types";
import {
  createSubItem,
  updateItem,
  deleteItem,
  bulkToggleItems,
} from "@/app/_server/actions/checklist-item";
import { getUsersWithAccess } from "@/app/_server/actions/sharing";
import { getUsers } from "@/app/_server/actions/users";
import {
  Add01Icon,
  FloppyDiskIcon,
  MultiplicationSignIcon,
  UserIcon,
} from "hugeicons-react";
import { NestedChecklistItem } from "@/app/_components/FeatureComponents/Checklists/Parts/Simple/NestedChecklistItem";
import { convertMarkdownToHtml } from "@/app/_utils/markdown-utils";
import { usePermissions } from "@/app/_providers/PermissionsProvider";
import { usePreferredDateTime } from "@/app/_hooks/usePreferredDateTime";
import { useTranslations } from "next-intl";
import { getPriorityColor, getPriorityLabel } from "@/app/_utils/kanban/index";
import { KanbanPriorityLevel } from "@/app/_types/enums";
import { Router } from "next/router";

interface KanbanCardDetailProps {
  checklist: Checklist;
  item: Item;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedChecklist: Checklist) => void;
  checklistId: string;
  category: string;
  isShared: boolean;
}

const _sanitizeDescription = (text: string): string =>
  text.replace(/\n/g, "\\n");

const _unsanitizeDescription = (text: string): string =>
  text.replace(/\\n/g, "\n");

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

export const KanbanCardDetail = ({
  checklist,
  item: initialItem,
  isOpen,
  onClose,
  onUpdate,
  checklistId,
  category,
  isShared,
}: KanbanCardDetailProps) => {
  const t = useTranslations();
  const { permissions } = usePermissions();
  const { formatDateTimeString } = usePreferredDateTime();
  console.log(initialItem);
  const [item, setItem] = useState(initialItem);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(initialItem.text);
  const [editDescription, setEditDescription] = useState(
    _unsanitizeDescription(initialItem.description || ""),
  );
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [scoreInput, setScoreInput] = useState(
    initialItem.score?.toString() || "",
  );
  const [reminderInput, setReminderInput] = useState(
    initialItem.reminder?.datetime || "",
  );
  const [targetDateInput, setTargetDateInput] = useState(
    initialItem.targetDate || "",
  );
  const [priorityInput, setPriorityInput] = useState<KanbanPriority>(
    initialItem.priority || KanbanPriorityLevel.NONE,
  );
  const [assigneeInput, setAssigneeInput] = useState(
    initialItem.assignee || "",
  );
  const [availableUsers, setAvailableUsers] = useState<
    { username: string; avatarUrl?: string }[]
  >([]);

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
      const sharedWithUsers = await getUsersWithAccess(
        checklistId,
        checklist.uuid,
      );
      const userMap = new Map<
        string,
        { username: string; avatarUrl?: string }
      >();
      allUsers.forEach((u: { username: string; avatarUrl?: string }) => {
        userMap.set(u.username, {
          username: u.username,
          avatarUrl: u.avatarUrl,
        });
      });
      sharedWithUsers.forEach((username: string) => {
        if (!userMap.has(username)) {
          userMap.set(username, { username });
        }
      });
      if (checklist.owner && !userMap.has(checklist.owner)) {
        userMap.set(checklist.owner, { username: checklist.owner });
      }
      setAvailableUsers(Array.from(userMap.values()));
    };
    _loadUsers();
  }, [isOpen, checklistId, checklist.uuid, checklist.owner]);

  const descriptionHtml = useMemo(() => {
    const noDescText = `<p class="text-muted-foreground text-md lg:text-sm opacity-50">${t(
      "checklists.noDescription",
    )}</p>`;
    if (!item.description) return noDescText;
    const unsanitized = _unsanitizeDescription(item.description);
    const withLineBreaks = unsanitized.replace(/\n/g, "  \n");
    return convertMarkdownToHtml(withLineBreaks) || noDescText;
  }, [item.description, t]);

  const _findItemInChecklist = (
    checklist: Checklist,
    itemId: string,
  ): Item | null => {
    const searchItems = (items: Item[]): Item | null => {
      for (const item of items) {
        if (item.id === itemId) return item;
        if (item.children) {
          const found = searchItems(item.children);
          if (found) return found;
        }
      }
      return null;
    };
    return searchItems(checklist.items);
  };

  const _saveField = async (fields: Record<string, string>) => {
    const formData = new FormData();
    formData.append("listId", checklistId);
    formData.append("itemId", item.id);
    formData.append("category", category);
    Object.entries(fields).forEach(([key, value]) => {
      formData.append(key, value);
    });
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

    if (
      editText.trim() !== item.text ||
      editDescription.trim() !== currentUnsanitized
    ) {
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
          setEditDescription(
            _unsanitizeDescription(updatedItem.description || ""),
          );
        }
      }
    }
    setIsEditing(false);
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskText.trim()) return;

    const formData = new FormData();
    formData.append("listId", checklistId);
    formData.append("parentId", item.id);
    formData.append("text", newSubtaskText.trim());
    formData.append("category", category);

    const result = await createSubItem(formData);
    if (result.success && result.data) {
      onUpdate(result.data);
      const updatedItem = _findItemInChecklist(result.data, item.id);
      if (updatedItem) setItem(updatedItem);
      setNewSubtaskText("");
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
        if (subtask.children && subtask.children.length > 0) {
          targets.push(..._findTargetItems(subtask.children));
        }
      });
      return targets;
    };

    const targetItems = _findTargetItems(item.children);
    if (targetItems.length === 0) return;

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

  const handleAssigneeChange = async (username: string) => {
    setAssigneeInput(username);
    await _saveField({ assignee: username });
  };

  const handleReminderSave = async () => {
    await _saveField({
      reminder: reminderInput
        ? JSON.stringify({ datetime: new Date(reminderInput).toISOString() })
        : "",
    });
  };

  const handleTargetDateChange = async (value: string) => {
    setTargetDateInput(value);
    await _saveField({
      targetDate: value ? new Date(value).toISOString() : "",
    });
  };

  const priorities: KanbanPriority[] = [
    KanbanPriorityLevel.CRITICAL,
    KanbanPriorityLevel.HIGH,
    KanbanPriorityLevel.MEDIUM,
    KanbanPriorityLevel.LOW,
    KanbanPriorityLevel.NONE,
  ];

  const assigneeOptions = useMemo(
    () => [
      {
        id: "",
        name: (
          <span className="flex items-center gap-2 text-muted-foreground">
            <UserIcon className="h-4 w-4" />
            {t("kanban.unassigned")}
          </span>
        ),
      },
      ...availableUsers.map((user) => ({
        id: user.username,
        name: (
          <span className="flex items-center gap-2">
            <UserAvatar
              username={user.username}
              avatarUrl={user.avatarUrl}
              size="xs"
            />
            {user.username}
          </span>
        ),
      })),
    ],
    [availableUsers, t],
  );

  const renderMetadata = () => {
    const metadata = [];

    if (item.createdBy) {
      metadata.push(
        t("common.createdByOn", {
          user: item.createdBy,
          date: formatDateTimeString(item.createdAt!),
        }),
      );
    }

    if (item.lastModifiedBy) {
      metadata.push(
        t("common.lastModifiedByOn", {
          user: item.lastModifiedBy,
          date: formatDateTimeString(item.lastModifiedAt!),
        }),
      );
    }

    if (item.history?.length) {
      metadata.push(t("common.statusChanges", { count: item.history.length }));
    }

    return metadata.length ? (
      <div className="border-t border-border pt-4">
        <div className="bg-muted/30 rounded-jotty p-3 border border-border/50">
          <h5 className="text-md lg:text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {t("auditLogs.metadata")}
          </h5>
          <div className="space-y-1.5">
            {metadata.map((text, i) => (
              <p
                key={i}
                className="text-md lg:text-xs text-muted-foreground flex items-start gap-2"
              >
                <span className="text-muted-foreground/40">&bull;</span>
                <span>{text}</span>
              </p>
            ))}
          </div>
        </div>
      </div>
    ) : null;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={item.text || t("checklists.untitledTask")}
      className="lg:!max-w-[80vw] lg:!w-full lg:!h-[80vh] !max-h-[80vh] overflow-y-auto"
    >
      <div className="space-y-6">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-md lg:text-sm font-medium text-foreground mb-2">
                {t("kanban.itemTitle")}
              </label>
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-jotty focus:outline-none focus:ring-none focus:ring-ring focus:border-ring transition-all text-base"
                placeholder={t("checklists.enterTaskTitle")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSave();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setEditText(item.text);
                    setEditDescription(
                      _unsanitizeDescription(item.description || ""),
                    );
                    setIsEditing(false);
                  }
                }}
              />
            </div>
            <div>
              <label className="block text-md lg:text-sm font-medium text-foreground mb-2">
                {t("common.description")}
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-jotty focus:outline-none focus:ring-none focus:ring-ring focus:border-ring transition-all min-h-[120px] text-base resize-y"
                placeholder={t("checklists.addDescriptionOptional")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) {
                    e.preventDefault();
                    handleSave();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setEditText(item.text);
                    setEditDescription(
                      _unsanitizeDescription(item.description || ""),
                    );
                    setIsEditing(false);
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setEditText(item.text);
                  setEditDescription(
                    _unsanitizeDescription(item.description || ""),
                  );
                  setIsEditing(false);
                }}
              >
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
          <div className="space-y-4">
            <div
              className={`bg-card border border-border rounded-jotty p-4 shadow-sm ${permissions?.canEdit ? "cursor-pointer" : ""}`}
              onClick={() => permissions?.canEdit && setIsEditing(true)}
            >
              <div
                className="text-card-foreground prose leading-relaxed prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            </div>
          </div>
        )}

        {!isEditing && permissions?.canEdit && (
          <div className="border-t border-border pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-md lg:text-xs font-medium text-muted-foreground mb-1.5">
                  {t("kanban.priority")}
                </label>
                <div className="flex flex-wrap gap-1">
                  {priorities.map((p) => (
                    <button
                      key={p}
                      onClick={() => handlePriorityChange(p)}
                      className={`text-[11px] px-2 py-1 rounded-full border transition-all ${
                        priorityInput === p
                          ? `${getPriorityColor(p)} border-current font-semibold`
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {getPriorityLabel(p, t)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-md lg:text-xs font-medium text-muted-foreground mb-1.5">
                  {t("kanban.score")}
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={scoreInput}
                  onChange={(e) => setScoreInput(e.target.value)}
                  onBlur={handleScoreSave}
                  onKeyDown={(e) => e.key === "Enter" && handleScoreSave()}
                  className="w-20 px-2 py-1 text-sm bg-background border border-input rounded-jotty focus:outline-none focus:border-ring"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-md lg:text-xs font-medium text-muted-foreground mb-1.5">
                  {t("kanban.assignee")}
                </label>
                <Dropdown
                  value={assigneeInput}
                  options={assigneeOptions}
                  onChange={(value) => handleAssigneeChange(value)}
                  placeholder={t("kanban.unassigned")}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-md lg:text-xs font-medium text-muted-foreground mb-1.5">
                  {t("kanban.reminder")}
                </label>
                <input
                  type="datetime-local"
                  value={_toLocalDateTimeValue(reminderInput)}
                  onChange={(e) => setReminderInput(e.target.value)}
                  onBlur={handleReminderSave}
                  className="w-full px-2 py-1.5 text-sm bg-background border border-input rounded-jotty focus:outline-none focus:border-ring"
                />
              </div>

              <div>
                <label className="block text-md lg:text-xs font-medium text-muted-foreground mb-1.5">
                  {t("kanban.targetDate")}
                </label>
                <input
                  type="date"
                  value={_toLocalDateValue(targetDateInput)}
                  onChange={(e) => handleTargetDateChange(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm bg-background border border-input rounded-jotty focus:outline-none focus:border-ring"
                />
              </div>
            </div>
          </div>
        )}

        {!isEditing && (
          <div className="border-t border-border pt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-semibold text-foreground flex items-center gap-2">
                <span>{t("checklists.subtasks")}</span>
                {item.children?.length ? (
                  <span className="text-md lg:text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {item.children.filter((s) => s.completed).length} /{" "}
                    {item.children.length}
                  </span>
                ) : null}
              </h4>
              {permissions?.canEdit && (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleAll(true)}
                    disabled={!item.children?.length}
                    className="text-md lg:text-xs"
                  >
                    {t("common.completeAll")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleAll(false)}
                    disabled={!item.children?.length}
                    className="text-md lg:text-xs"
                  >
                    {t("common.resetAll")}
                  </Button>
                </div>
              )}
            </div>

            {item.children?.length ? (
              <div className="space-y-2 mb-4 bg-background-secondary/50 rounded-jotty p-3 border border-border/50">
                {item.children.map((subtask, index) => (
                  <NestedChecklistItem
                    isSubtask={true}
                    key={subtask.id}
                    item={subtask}
                    index={index.toString()}
                    level={1}
                    onToggle={handleToggleSubtask}
                    onDelete={handleDeleteSubtask}
                    onEdit={handleEditSubtask}
                    onAddSubItem={handleAddNestedSubtask}
                    isDeletingItem={false}
                    isDragDisabled={true}
                    checklist={checklist}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-md lg:text-sm bg-muted/20 rounded-jotty border border-dashed border-border mb-4">
                {t("checklists.noSubtasksYet")}
              </div>
            )}

            {permissions?.canEdit && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubtaskText}
                  onChange={(e) => setNewSubtaskText(e.target.value)}
                  placeholder={t("checklists.addSubtask")}
                  className="flex-1 px-3 py-2 text-md lg:text-sm bg-background border border-input rounded-jotty focus:outline-none focus:ring-none focus:ring-ring focus:border-ring transition-all"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                />
                <Button
                  onClick={() => handleAddSubtask()}
                  disabled={!newSubtaskText.trim()}
                  title={t("checklists.addSubItem")}
                >
                  <Add01Icon className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {renderMetadata()}
      </div>
    </Modal>
  );
};
