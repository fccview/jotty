"use client";

import { Trash2, GripVertical, Edit2, Check, X } from "lucide-react";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { cn } from "@/app/_utils/global-utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSettings } from "@/app/_utils/settings-store";
import { useEmojiCache } from "@/app/_hooks/useEmojiCache";
import { useState, useEffect, useRef } from "react";
import { TaskStatus } from "@/app/_types/enums";
import { useTranslations } from "next-intl";

interface Item {
  id: string;
  text: string;
  completed: boolean;
  order: number;
  createdBy?: string;
  createdAt?: string;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
}

interface ChecklistItemProps {
  item: Item;
  index: number;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onEdit?: (id: string, text: string) => void;
  completed?: boolean;
  isPublicView?: boolean;
  status?: string;
  isDeletingItem: boolean;
}

export const ChecklistItem = ({
  item,
  index,
  onToggle,
  onDelete,
  onEdit,
  completed = false,
  isPublicView = false,
  status,
  isDeletingItem,
}: ChecklistItemProps) => {
  const t = useTranslations();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const { showEmojis } = useSettings();
  const emoji = useEmojiCache(item.text, showEmojis);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const displayText = showEmojis ? `${emoji}  ${item.text}` : item.text;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex items-center gap-3 p-3 bg-background hover:bg-muted/50 border border-border rounded-lg transition-all duration-200",
        isDragging && "opacity-50 scale-95 rotate-1 shadow-lg z-50",
        completed && "opacity-80"
      )}
    >
      {!isEditing && (item.createdBy || item.lastModifiedBy) && (
        <div className="absolute left-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 bg-background/98 backdrop-blur-sm border border-border rounded-md p-2.5 shadow-xl text-xs min-w-[200px]">
          {item.createdBy && (
            <div className="flex items-center gap-2 mb-1.5">
              <UserAvatar username={item.createdBy} size="sm" />
              <div className="flex-1">
                <div className="font-semibold text-foreground">
                  {item.createdBy}
                </div>
                <div className="text-muted-foreground text-[10px]">
                  {t("checklists.created")}{" "}
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleString()
                    : ""}
                </div>
              </div>
            </div>
          )}
          {item.lastModifiedBy && item.lastModifiedBy !== item.createdBy && (
            <div className="flex items-center gap-2 pt-1.5 border-t border-border/50">
              <UserAvatar username={item.lastModifiedBy} size="sm" />
              <div className="flex-1">
                <div className="font-semibold text-foreground">
                  {item.lastModifiedBy}
                </div>
                <div className="text-muted-foreground text-[10px]">
                  {t("checklists.modified")}{" "}
                  {item.lastModifiedAt
                    ? new Date(item.lastModifiedAt).toLocaleString()
                    : ""}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!isPublicView && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="text-muted-foreground hover:text-foreground cursor-move touch-manipulation"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}

      <div className="relative flex items-center">
        <input
          type="checkbox"
          checked={item.completed || status === TaskStatus.COMPLETED}
          id={item.id}
          onChange={(e) => onToggle(item.id, e.target.checked)}
          className={cn(
            "h-5 w-5 rounded border-input focus:ring-2 focus:ring-offset-2 focus:ring-ring",
            "bg-background transition-colors duration-200",
            (item.completed || status === TaskStatus.COMPLETED) &&
            "bg-primary border-primary"
          )}
        />
      </div>

      {isEditing ? (
        <div className="flex-1 flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 text-sm border border-input bg-background rounded focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            className="h-6 w-6 p-0"
          >
            <Check className="h-3 w-3" />
          </Button>
          {!isDeletingItem && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancel}
              className="h-6 w-6 p-0"
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
            item.completed || status === TaskStatus.COMPLETED
              ? "line-through text-muted-foreground"
              : "text-foreground"
          )}
        >
          {displayText}
        </label>
      )}

      {!isEditing && (
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-xs text-muted-foreground mr-1">#{index}</span>
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
              variant="default"
              size="sm"
              onClick={() => onDelete(item.id)}
              className="h-8 w-8 p-0 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
