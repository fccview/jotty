"use client";

import { useState, useRef, useEffect, memo } from "react";
import {
  Add01Icon,
  Delete03Icon,
  DragDropVerticalIcon,
  PencilEdit02Icon,
  Tick02Icon,
  MultiplicationSignIcon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  MoreHorizontalIcon,
  SquareIcon,
  CheckmarkSquare02Icon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { cn } from "@/app/_utils/global-utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSettings } from "@/app/_utils/settings-store";
import { useEmojiCache } from "@/app/_hooks/useEmojiCache";
import { Checklist, Item } from "@/app/_types";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import LastModifiedCreatedInfo from "../Common/LastModifiedCreatedInfo";
import { RecurrenceIndicator } from "@/app/_components/GlobalComponents/Indicators/RecurrenceIndicator";
import { usePermissions } from "@/app/_providers/PermissionsProvider";
import { useTranslations } from "next-intl";

interface NestedChecklistItemProps {
  item: Item;
  index: string | number;
  level: number;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onEdit?: (id: string, text: string) => void;
  onAddSubItem?: (parentId: string, text: string) => void;
  completed?: boolean;
  isPublicView?: boolean;
  isDeletingItem: boolean;
  isDragDisabled?: boolean;
  isSubtask?: boolean;
  checklist: Checklist;
  isOver?: boolean;
  overPosition?: "before" | "after";
  isAnyItemDragging?: boolean;
  overItem?: { id: string; position: "before" | "after" } | null;
}

const NestedChecklistItemComponent = ({
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
  isSubtask = false,
  checklist,
  isOver = false,
  overPosition,
  isAnyItemDragging = false,
  overItem = null,
}: NestedChecklistItemProps) => {
  const t = useTranslations();
  const { usersPublicData, user } = useAppMode();
  const { permissions } = usePermissions();
  const getUserAvatarUrl = (username: string) => {
    if (!usersPublicData) return "";

    return (
      usersPublicData?.find(
        (user) => user.username?.toLowerCase() === username?.toLowerCase()
      )?.avatarUrl || ""
    );
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    disabled: isDragDisabled,
  });
  const { showEmojis } = useSettings();
  const emoji = useEmojiCache(item.text, showEmojis);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAddSubItem, setShowAddSubItem] = useState(false);
  const [newSubItemText, setNewSubItemText] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownOpenUpward, setDropdownOpenUpward] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownButtonRef = useRef<HTMLButtonElement>(null);

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
    setEditText(item.text.split(" | metadata:")[0].trim());
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
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleAddSubItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSubItemText.trim() && onAddSubItem) {
      onAddSubItem(item.id, newSubItemText.trim());
      setNewSubItemText("");
    }
  };

  const handleDropdownToggle = () => {
    if (!isDropdownOpen && dropdownButtonRef.current) {
      const rect = dropdownButtonRef.current.getBoundingClientRect();

      let scrollParent: HTMLElement | null = dropdownButtonRef.current.parentElement;
      while (scrollParent) {
        if (scrollParent.classList.contains('checklist-todo-container')) {
          break;
        }
        scrollParent = scrollParent.parentElement;
      }

      let shouldOpenUpward = false;

      if (scrollParent) {
        const containerRect = scrollParent.getBoundingClientRect();
        const containerStyle = window.getComputedStyle(scrollParent);
        const paddingBottom = parseInt(containerStyle.paddingBottom) || 0;

        const actualSpaceBelow = containerRect.bottom - rect.bottom - paddingBottom;
        const threshold = 200;

        shouldOpenUpward = actualSpaceBelow < threshold;
      }

      setDropdownOpenUpward(shouldOpenUpward);
    }
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleDropdownAction = (actionId: string) => {
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

  const cleanText = item.text.split(" | metadata:")[0].trim();
  const displayText = showEmojis ? `${emoji}  ${cleanText}` : cleanText;
  const hasChildren = item.children && item.children.length > 0;
  const isChild = level > 0;

  const dropdownOptions = [
    ...(onEdit ? [{ id: "edit", name: t("editor.edit"), icon: PencilEdit02Icon }] : []),
    ...(onAddSubItem
      ? [{ id: "add-sub-item", name: "Add sub-item", icon: Add01Icon }]
      : []),
    { id: "delete", name: t("common.delete"), icon: Delete03Icon },
  ];

  useEffect(() => {
    if (hasChildren && item.children) {
      const allChildrenCompleted = item.children.every(
        (child) => child.completed
      );
      if (allChildrenCompleted) {
        setIsExpanded(false);
      } else {
        setIsExpanded(true);
      }
    }
  }, [item.children, hasChildren]);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform:
          isAnyItemDragging && !isDragging
            ? CSS.Transform.toString({ x: 0, y: 0, scaleX: 1, scaleY: 1 })
            : CSS.Transform.toString(transform),
        transition: isAnyItemDragging && !isDragging ? "none" : transition,
      }}
      className={cn(
        "relative my-1",
        hasChildren &&
        !isChild &&
        "border-l-2 bg-muted/30 border-l-primary/70 rounded-jotty border-dashed border-t",
        !hasChildren &&
        !isChild &&
        "border-l-2 bg-muted/30 border-l-primary/70 rounded-jotty border-dashed border-t",
        isChild &&
        "ml-4 rounded-jotty border-dashed border-l border-border border-l-primary/70",
        "first:mt-0 transition-colors duration-150",
        isActive && "bg-muted/20",
        isDragging && "opacity-50 z-50",
        isSubtask && "bg-muted/30 border-l-0 !ml-0 !pl-0",
        isDropdownOpen && "z-50"
      )}
    >
      {isOver && overPosition === "before" && (
        <div className="absolute -top-2 left-0 right-0 h-1 bg-primary rounded-full z-10" />
      )}
      <div
        className={cn(
          "group/item flex items-center gap-1 hover:bg-muted/50 transition-all duration-200 checklist-item",
          "rounded-jotty",
          isChild ? "px-2.5 py-2" : "p-3",
          completed && "opacity-80",
          !permissions?.canEdit &&
          "opacity-50 cursor-not-allowed pointer-events-none"
        )}
      >
        {!isPublicView && !isDragDisabled && permissions?.canEdit && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="text-muted-foreground lg:block hover:text-foreground cursor-move touch-none"
          >
            <DragDropVerticalIcon className="h-4 w-4" />
          </button>
        )}

        <div className="relative flex items-center">
          <input
            type="checkbox"
            checked={item.completed || completed}
            id={item.id}
            onChange={(e) => {
              onToggle(item.id, e.target.checked);
            }}
            className={cn(
              "h-5 w-5 rounded border-input focus:ring-none focus:ring-offset-2 focus:ring-ring",
              "transition-all duration-150",
              (item.completed || completed) && "bg-primary border-primary"
            )}
          />
        </div>

        {isEditing ? (
          <div className="flex-1 flex items-center gap-2 w-full">
            {permissions?.canEdit && (
              <>
                <Input
                  id={item.id}
                  ref={inputRef}
                  type="text"
                  defaultValue={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSave}
                  className="h-6 w-6 p-0"
                >
                  <Tick02Icon className="h-3 w-3" />
                </Button>
              </>
            )}
            {!isDeletingItem && permissions?.canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="h-6 w-6 p-0 text-destructive"
              >
                <MultiplicationSignIcon className="h-3 w-3" />
              </Button>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-between gap-2">
            <div className="flex-1 flex gap-1.5">
              <label
                htmlFor={item.id}
                className={cn(
                  "text-sm transition-all duration-200 cursor-pointer items-center flex",
                  isActive && "scale-95",
                  item.completed || completed
                    ? "line-through text-muted-foreground"
                    : "text-foreground"
                )}
                onMouseDown={() => setIsActive(true)}
                onMouseUp={() => setIsActive(false)}
                onMouseLeave={() => setIsActive(false)}
              >
                {item.completed || completed ? (
                  <CheckmarkSquare02Icon className="h-8 w-8 min-w-8 sm:h-6 sm:w-6 sm:min-w-6 text-primary mr-2 !stroke-1" />
                ) : (
                  <SquareIcon className="h-8 w-8 min-w-8 sm:h-6 sm:w-6 sm:min-w-6 text-muted-foreground mr-2 !stroke-1" />
                )}

                {item.recurrence && user?.enableRecurrence === "enable" && (
                  <RecurrenceIndicator recurrence={item.recurrence} />
                )}

                <span>{displayText}</span>
              </label>
            </div>

            <LastModifiedCreatedInfo
              item={item}
              checklist={checklist}
              getUserAvatarUrl={getUserAvatarUrl}
            />
          </div>
        )}

        {!isEditing && permissions?.canEdit && (
          <div className="flex items-center gap-1 opacity-50 lg:opacity-0 group-hover/item:opacity-100 transition-opacity">
            <span className="text-xs text-muted-foreground mr-1">#{index}</span>

            <div className="hidden lg:flex items-center gap-1">
              {!isPublicView && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddSubItem(!showAddSubItem)}
                  className="h-8 w-8 p-0"
                  title={t("checklists.addSubItem")}
                >
                  <Add01Icon className="h-4 w-4" />
                </Button>
              )}

              {onEdit && !isPublicView && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEdit}
                  className="h-8 w-8 p-0"
                >
                  <PencilEdit02Icon className="h-4 w-4" />
                </Button>
              )}

              {!isPublicView && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete(item.id)}
                  className="h-8 w-8 p-0"
                >
                  <Delete03Icon className="h-4 w-4" />
                </Button>
              )}
            </div>

            {!isPublicView && (
              <div className="lg:hidden relative" ref={dropdownRef}>
                <Button
                  ref={dropdownButtonRef}
                  variant="ghost"
                  size="sm"
                  onClick={handleDropdownToggle}
                  className="h-8 w-8 p-0"
                >
                  <MoreHorizontalIcon className="h-4 w-4" />
                </Button>



                {isDropdownOpen && (
                  <div className={cn(
                    "absolute right-0 z-50 w-48 bg-card border border-border rounded-jotty shadow-lg",
                    dropdownOpenUpward ? "bottom-full mb-1 top-auto" : "top-full mt-1"
                  )}>
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

            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-6 w-6 p-0"
              >
                {isExpanded ? (
                  <ArrowDown01Icon className="h-4 w-4" />
                ) : (
                  <ArrowRight01Icon className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        )}
      </div>
      {isOver && overPosition === "after" && (
        <div className="absolute -bottom-2 left-0 right-0 h-1 bg-primary rounded-full z-10" />
      )}

      {showAddSubItem && !isPublicView && (
        <div className="mt-2 mb-2" style={{ paddingLeft: "32px" }}>
          <form onSubmit={handleAddSubItem} className="flex gap-2 items-center pr-4">
            <Input
              id={`add-subitem-${item.id}`}
              type="text"
              value={newSubItemText}
              onChange={(e) => setNewSubItemText(e.target.value)}
              placeholder={t("checklists.addSubItemPlaceholder")}
              autoFocus
            />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              disabled={!newSubItemText.trim()}
              className="h-8 w-8 p-0"
              title={t('common.add')}
            >
              <Add01Icon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddSubItem(false);
                setNewSubItemText("");
              }}
              className="h-8 w-8 p-0"
            >
              <MultiplicationSignIcon className="h-4 w-4" />
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
              index={`${index}.${childIndex}`}
              level={level + 1}
              onToggle={onToggle}
              onDelete={onDelete}
              onEdit={onEdit}
              onAddSubItem={onAddSubItem}
              isDeletingItem={isDeletingItem}
              isDragDisabled={isDragDisabled}
              isPublicView={isPublicView}
              checklist={checklist}
              isOver={overItem?.id === child.id}
              overPosition={
                overItem?.id === child.id ? overItem.position : undefined
              }
              isAnyItemDragging={isAnyItemDragging}
              overItem={overItem}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const NestedChecklistItem = memo(NestedChecklistItemComponent);
