"use client";

import { useState, useRef, useEffect } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  Edit2,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { cn } from "@/app/_utils/global-utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSettings } from "@/app/_utils/settings-store";
import { useEmojiCache } from "@/app/_hooks/useEmojiCache";
import { Item } from "@/app/_types";

interface NestedChecklistItemProps {
  item: Item;
  index: number;
  level: number;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onEdit?: (id: string, text: string) => void;
  onAddSubItem?: (parentId: string, text: string) => void;
  completed?: boolean;
  isPublicView?: boolean;
  isDeletingItem: boolean;
  isDragDisabled?: boolean;
}

export const NestedChecklistItem = ({
  item,
  index,
  level,
  onToggle,
  onDelete,
  onEdit,
  onAddSubItem,
  completed = false,
  isPublicView = false,
  isDeletingItem,
  isDragDisabled = false,
}: NestedChecklistItemProps) => {
  const sortableProps = useSortable({ id: item.id });
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = isDragDisabled
      ? {
        attributes: {},
        listeners: {},
        setNodeRef: null,
        transform: null,
        transition: null,
        isDragging: false,
      }
      : sortableProps;

  const { showEmojis } = useSettings();
  const emoji = useEmojiCache(item.text, showEmojis);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAddSubItem, setShowAddSubItem] = useState(false);
  const [newSubItemText, setNewSubItemText] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDropdownOpen]);

  const handleEdit = () => {
    setIsEditing(true);
    setEditText(item.text);
  };

  const handleSave = () => {
    if (editText.trim() && editText !== item.text && onEdit) {
      onEdit(item.id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(item.text);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const handleAddSubItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSubItemText.trim() && onAddSubItem) {
      onAddSubItem(item.id, newSubItemText.trim());
      setNewSubItemText("");
      setShowAddSubItem(false);
    }
  };

  const handleDropdownAction = (actionId: string) => {
    setSelectedAction(actionId);
    setIsDropdownOpen(false);
    switch (actionId) {
      case "edit":
        handleEdit();
        break;
      case "add-sub-item":
        setShowAddSubItem(true);
        break;
      case "delete":
        onDelete(item.id);
        break;
    }
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const displayText = showEmojis ? `${emoji}  ${item.text}` : item.text;
  const hasChildren = item.children && item.children.length > 0;
  const isChild = level > 0;

  const dropdownOptions = [
    ...(onEdit ? [{ id: "edit", name: "Edit", icon: Edit2 }] : []),
    ...(onAddSubItem
      ? [{ id: "add-sub-item", name: "Add sub-item", icon: Plus }]
      : []),
    { id: "delete", name: "Delete", icon: Trash2 },
  ];

  return (
    <div
      ref={setNodeRef}
      style={style as React.CSSProperties}
      className={cn(
        "group/item relative my-1",
        hasChildren &&
        !isChild &&
        "border-l-2 bg-muted/30 border-l-primary/70 rounded-lg border-dashed border-t",
        !hasChildren &&
        !isChild &&
        "border-l-2 bg-muted/30 border-l-primary/70 rounded-lg border-dashed border-t",
        isChild &&
        "ml-4 pl-4 rounded-lg border-dashed border-l border-border border-l-primary/70",
        "first:mt-0",
        isDragging && "opacity-50 scale-95 rotate-1 shadow-lg z-50"
      )}
    >
      <div
        className={cn(
          "group flex items-center gap-1 hover:bg-muted/50 transition-all duration-200 checklist-item",
          "rounded-lg",
          isChild ? "px-2.5 py-2" : "p-3",
          completed && "opacity-80"
        )}
      >
        {!isPublicView && !isDragDisabled && !isChild && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="text-muted-foreground hidden lg:block hover:text-foreground cursor-move touch-manipulation"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}

        <div className="relative flex items-center">
          <input
            type="checkbox"
            checked={item.completed || completed}
            id={item.id}
            onChange={(e) => onToggle(item.id, e.target.checked)}
            className={cn(
              "h-5 w-5 rounded border-input focus:ring-2 focus:ring-offset-2 focus:ring-ring",
              "transition-colors duration-200",
              (item.completed || completed) && "bg-primary border-primary"
            )}
          />
        </div>

        {hasChildren && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        )}

        {isEditing ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 px-2 py-1 text-sm border border-input rounded focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              className="h-6 w-6 p-0"
            >
              <Check className="h-3 w-3" />
            </Button>
            {!isDeletingItem && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="h-6 w-6 p-0 text-destructive"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ) : (
          <label
            htmlFor={item.id}
            className={cn(
              "flex-1 text-sm transition-all duration-200 cursor-pointer",
              (item.completed || completed)
                ? "line-through text-muted-foreground checked"
                : "text-foreground"
            )}
          >
            {displayText}
          </label>
        )}

        <div className="flex items-center gap-1 opacity-50 lg:opacity-0 group-hover/item:opacity-100 transition-opacity">
          <span className="text-xs text-muted-foreground mr-1">#{index}</span>

          <div className="hidden lg:flex items-center gap-1">
            {!isEditing && !isPublicView && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddSubItem(!showAddSubItem)}
                className="h-8 w-8 p-0"
                title="Add sub-item"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}

            {!isEditing && onEdit && !isPublicView && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEdit}
                className="h-8 w-8 p-0"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}

            {!isPublicView && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(item.id)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {!isEditing && !isPublicView && (
            <div className="lg:hidden relative" ref={dropdownRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="h-8 w-8 p-0"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>

              {isDropdownOpen && (
                <div className="absolute right-0 z-50 w-48 mt-1 bg-card border border-border rounded-lg shadow-lg">
                  <div className="py-1">
                    {dropdownOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleDropdownAction(option.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                      >
                        {option.icon && <option.icon className="h-4 w-4" />}
                        <span>{option.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showAddSubItem && !isPublicView && (
        <div className="mt-2 mb-2" style={{ paddingLeft: "32px" }}>
          <form onSubmit={handleAddSubItem} className="flex gap-2 items-center">
            <div className="flex-1 flex items-center gap-2">
              <div className="h-5 w-5 border border-border rounded bg-background"></div>
              <input
                type="text"
                value={newSubItemText}
                onChange={(e) => setNewSubItemText(e.target.value)}
                placeholder="Add sub-item..."
                className="flex-1 px-2 py-1 text-sm border border-input bg-background rounded focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={!newSubItemText.trim()}
              className="px-3"
            >
              Add
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddSubItem(false);
                setNewSubItemText("");
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}

      {hasChildren && isExpanded && (
        <div className={cn("pt-1")}>
          {item.children!.map((child, childIndex) => (
            <NestedChecklistItem
              key={child.id}
              item={child}
              index={childIndex}
              level={level + 1}
              onToggle={onToggle}
              onDelete={onDelete}
              onEdit={onEdit}
              onAddSubItem={onAddSubItem}
              isDeletingItem={isDeletingItem}
              isDragDisabled={isDragDisabled}
            />
          ))}
        </div>
      )}
    </div>
  );
};
