"use client";

import { useState, useEffect, useMemo } from "react";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Item, Checklist } from "@/app/_types";
import {
  createSubItem,
  updateItem,
  deleteItem,
} from "@/app/_server/actions/checklist-item";
import {
  Add01Icon,
  FloppyDiskIcon,
  MultiplicationSignIcon,
} from "hugeicons-react";
import { NestedChecklistItem } from "@/app/_components/FeatureComponents/Checklists/Parts/Simple/NestedChecklistItem";
import { convertMarkdownToHtml } from "@/app/_utils/markdown-utils";
import { usePermissions } from "@/app/_providers/PermissionsProvider";
import { usePreferredDateTime } from "@/app/_hooks/usePreferredDateTime";
import { useTranslations } from "next-intl";

interface SubtaskModalProps {
  checklist: Checklist;
  item: Item;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedChecklist: Checklist) => void;
  checklistId: string;
  category: string;
  isShared: boolean;
}

const sanitizeDescription = (text: string): string => {
  return text.replace(/\n/g, "\\n");
};

const unsanitizeDescription = (text: string): string => {
  return text.replace(/\\n/g, "\n");
};

export const SubtaskModal = ({
  checklist,
  item: initialItem,
  isOpen,
  onClose,
  onUpdate,
  checklistId,
  category,
  isShared,
}: SubtaskModalProps) => {
  const t = useTranslations();
  const { permissions } = usePermissions();
  const { formatDateTimeString } = usePreferredDateTime();

  const [item, setItem] = useState(initialItem);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const [editDescription, setEditDescription] = useState(
    unsanitizeDescription(item.description || "")
  );
  const [newSubtaskText, setNewSubtaskText] = useState("");

  useEffect(() => {
    setItem(initialItem);
    setEditText(initialItem.text);
    setEditDescription(unsanitizeDescription(initialItem.description || ""));
  }, [initialItem]);

  const descriptionHtml = useMemo(() => {
    const noDescText = `<p class="text-muted-foreground text-sm opacity-50">${t("checklists.noDescription")}</p>`;
    if (!item.description) return noDescText;
    const unsanitized = unsanitizeDescription(item.description);
    const withLineBreaks = unsanitized.replace(/\n/g, "  \n");
    return convertMarkdownToHtml(withLineBreaks) || noDescText;
  }, [item.description, t]);

  const findItemInChecklist = (
    checklist: Checklist,
    itemId: string
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

  const handleSave = async () => {
    const sanitizedDescription = sanitizeDescription(editDescription.trim());
    const currentUnsanitized = unsanitizeDescription(item.description || "");

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
        const updatedItem = findItemInChecklist(result.data, item.id);
        if (updatedItem) {
          setItem(updatedItem);
          setEditText(updatedItem.text);
          setEditDescription(
            unsanitizeDescription(updatedItem.description || "")
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
      const updatedItem = findItemInChecklist(result.data, item.id);
      if (updatedItem) {
        setItem(updatedItem);
      }
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
      const updatedItem = findItemInChecklist(result.data, item.id);
      if (updatedItem) {
        setItem(updatedItem);
      }
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
      const updatedItem = findItemInChecklist(result.data, item.id);
      if (updatedItem) {
        setItem(updatedItem);
      }
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
      const updatedItem = findItemInChecklist(result.data, item.id);
      if (updatedItem) {
        setItem(updatedItem);
      }
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
      const updatedItem = findItemInChecklist(result.data, item.id);
      if (updatedItem) {
        setItem(updatedItem);
      }
    }
  };

  const handleToggleAll = async (completed: boolean) => {
    if (!item.children?.length) return;

    for (const subtask of item.children) {
      const formData = new FormData();
      formData.append("listId", checklistId);
      formData.append("itemId", subtask.id);
      formData.append("completed", completed.toString());
      formData.append("category", category);

      const result = await updateItem(checklist, formData);
      if (result.success && result.data) {
        onUpdate(result.data);
      }
    }
  };

  const renderMetadata = () => {
    const metadata = [];

    if (item.createdBy) {
      metadata.push(
        `Created by ${item.createdBy} on ${formatDateTimeString(
          item.createdAt!
        )}`
      );
    }

    if (item.lastModifiedBy) {
      metadata.push(
        `Last modified by ${item.lastModifiedBy} on ${formatDateTimeString(
          item.lastModifiedAt!
        )}`
      );
    }

    if (item.history?.length) {
      metadata.push(`Status changes: ${item.history.length}`);
    }

    return metadata.length ? (
      <div className="border-t border-border pt-4">
        <div className="bg-muted/30 rounded-jotty p-3 border border-border/50">
          <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {t("auditLogs.metadata")}
          </h5>
          <div className="space-y-1.5">
            {metadata.map((text, i) => (
              <p
                key={i}
                className="text-xs text-muted-foreground flex items-start gap-2"
              >
                <span className="text-muted-foreground/40">•</span>
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
              <label className="block text-sm font-medium text-foreground mb-2">{t('tasks.taskTitle')}</label>
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
                      unsanitizeDescription(item.description || "")
                    );
                    setIsEditing(false);
                  }
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">{t('common.description')}</label>
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
                      unsanitizeDescription(item.description || "")
                    );
                    setIsEditing(false);
                  }
                }}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Press{" "}
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] border border-border">
                  Enter
                </kbd>{" "}
                to save title,
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] border border-border mx-1">
                  Ctrl+Enter
                </kbd>{" "}
                to save description,
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] border border-border ml-1">
                  Esc
                </kbd>{" "}
                to cancel
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setEditText(item.text);
                  setEditDescription(
                    unsanitizeDescription(item.description || "")
                  );
                  setIsEditing(false);
                }}
              >
                <MultiplicationSignIcon className="h-4 w-4 mr-2" />{t('common.cancel')}</Button>
              <Button onClick={handleSave}>
                <FloppyDiskIcon className="h-4 w-4 mr-2" />
                {t("admin.saveChanges")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className={`bg-card border border-border rounded-jotty p-4 shadow-sm ${
                permissions?.canEdit ? "cursor-pointer" : ""
              }`}
              onClick={() => permissions?.canEdit && setIsEditing(true)}
            >
              <div
                className="text-card-foreground prose leading-relaxed prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            </div>
          </div>
        )}

        {!isEditing && (
          <div className="border-t border-border pt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-semibold text-foreground flex items-center gap-2">
                <span>{t("checklists.subtasks")}</span>
                {item.children?.length ? (
                  <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
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
                    className="text-xs"
                  >
                    Complete All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleAll(false)}
                    disabled={!item.children?.length}
                    className="text-xs"
                  >
                    Reset All
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
              <div className="text-center py-8 text-muted-foreground text-sm bg-muted/20 rounded-jotty border border-dashed border-border mb-4">
                No subtasks yet. Add one below to get started.
              </div>
            )}

            {permissions?.canEdit && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubtaskText}
                  onChange={(e) => setNewSubtaskText(e.target.value)}
                  placeholder={t("checklists.addSubtask")}
                  className="flex-1 px-3 py-2 text-sm bg-background border border-input rounded-jotty focus:outline-none focus:ring-none focus:ring-ring focus:border-ring transition-all"
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
                  title="Add subtask"
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
