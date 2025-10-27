"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Item, Checklist } from "@/app/_types";
import {
  createSubItem,
  updateItem,
  deleteItem,
} from "@/app/_server/actions/checklist-item";
import { Edit2, Plus, Save, X } from "lucide-react";
import { NestedChecklistItem } from "@/app/_components/FeatureComponents/Checklists/Parts/Simple/NestedChecklistItem";

interface SubtaskModalProps {
  item: Item;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedChecklist: Checklist) => void;
  checklistId: string;
  category: string;
  isShared: boolean;
}

export const SubtaskModal = ({
  item: initialItem,
  isOpen,
  onClose,
  onUpdate,
  checklistId,
  category,
  isShared,
}: SubtaskModalProps) => {
  const [item, setItem] = useState(initialItem);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const [editDescription, setEditDescription] = useState(
    item.description || ""
  );
  const [newSubtaskText, setNewSubtaskText] = useState("");

  useEffect(() => {
    setItem(initialItem);
    setEditText(initialItem.text);
    setEditDescription(initialItem.description || "");
  }, [initialItem]);

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
    if (
      editText.trim() !== item.text ||
      editDescription.trim() !== (item.description || "")
    ) {
      const formData = new FormData();
      formData.append("listId", checklistId);
      formData.append("itemId", item.id);
      formData.append("text", editText.trim());
      formData.append("description", editDescription.trim());
      formData.append("category", category);

      const result = await updateItem(formData);
      if (result.success && result.data) {
        onUpdate(result.data);
        const updatedItem = findItemInChecklist(result.data, item.id);
        if (updatedItem) {
          setItem(updatedItem);
          setEditText(updatedItem.text);
          setEditDescription(updatedItem.description || "");
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

    const result = await updateItem(formData);
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

    const result = await updateItem(formData);
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

      const result = await updateItem(formData);
      if (result.success && result.data) {
        onUpdate(result.data);
      }
    }
  };

  const renderMetadata = () => {
    const metadata = [];

    if (item.createdBy) {
      metadata.push(
        `Created by ${item.createdBy} on ${new Date(
          item.createdAt!
        ).toLocaleString()}`
      );
    }

    if (item.lastModifiedBy) {
      metadata.push(
        `Last modified by ${item.lastModifiedBy} on ${new Date(
          item.lastModifiedAt!
        ).toLocaleString()}`
      );
    }

    if (item.history?.length) {
      metadata.push(`Status changes: ${item.history.length}`);
    }

    return metadata.length ? (
      <div className="text-xs text-muted-foreground space-y-1 mt-4">
        {metadata.map((text, i) => (
          <p key={i}>{text}</p>
        ))}
      </div>
    ) : null;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Task" : "Task Details"}
      className="lg:max-w-[80vw]"
    >
      <div className="space-y-4">
        {isEditing ? (
          <div className="space-y-4">
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full p-2 bg-background border border-border rounded-md"
              placeholder="Task title"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSave();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setEditText(item.text);
                  setEditDescription(item.description || "");
                  setIsEditing(false);
                }
              }}
            />
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full p-2 bg-background border border-border rounded-md min-h-[100px]"
              placeholder="Task description (optional)"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) {
                  e.preventDefault();
                  handleSave();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setEditText(item.text);
                  setEditDescription(item.description || "");
                  setIsEditing(false);
                }
              }}
            />
            <div className="text-xs text-muted-foreground mb-2">
              Press Enter to save title, Ctrl+Enter to save description, Escape
              to cancel
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setEditText(item.text);
                  setEditDescription(item.description || "");
                  setIsEditing(false);
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-medium">{item.text}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>

            {item?.description && (
              <p className="text-muted-foreground whitespace-pre-wrap">
                {item.description}
              </p>
            )}
          </div>
        )}

        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">Subtasks</h4>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleAll(true)}
                disabled={!item.children?.length}
              >
                Complete All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleAll(false)}
                disabled={!item.children?.length}
              >
                Reset All
              </Button>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            {item.children?.map((subtask, index) => (
              <NestedChecklistItem
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
                isShared={isShared}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newSubtaskText}
              onChange={(e) => setNewSubtaskText(e.target.value)}
              placeholder="Add a subtask..."
              className="flex-1 p-2 text-sm bg-background border border-border rounded-md"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAddSubtask();
                }
              }}
            />
            <Button onClick={() => handleAddSubtask()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {renderMetadata()}
      </div>
    </Modal>
  );
};
