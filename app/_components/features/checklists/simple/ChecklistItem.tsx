"use client";

import { Trash2, GripVertical, Edit2, Check, X } from "lucide-react";
import { Button } from "@/app/_components/ui/elements/button";
import { cn } from "@/app/_utils/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSettings } from "@/app/_utils/settings-store";
import { useEmojiCache } from "@/app/_components/hooks/useEmojiCache";
import { useState, useEffect, useRef } from "react";
import { usePlugins } from "@/app/_components/providers/PluginProvider";

interface Item {
  id: string;
  text: string;
  completed: boolean;
  order: number;
  pluginData?: Record<string, any>;
}

interface ChecklistItemProps {
  item: Item;
  index: number;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onEdit?: (id: string, text: string) => void;
  completed?: boolean;
}

// The base component with your original styling
function BaseChecklistItem({
  item,
  index,
  onToggle,
  onDelete,
  onEdit,
  completed = false,
}: ChecklistItemProps) {
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
        "group flex items-center gap-3 p-3 bg-background hover:bg-muted/50 border border-border rounded-lg transition-all duration-200",
        isDragging && "opacity-50 scale-95 rotate-1 shadow-lg z-50",
        completed && "opacity-80"
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="text-muted-foreground hover:text-foreground cursor-move touch-manipulation"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="relative flex items-center">
        <input
          type="checkbox"
          checked={item.completed}
          id={item.id}
          onChange={(e) => onToggle(item.id, e.target.checked)}
          className={cn(
            "h-5 w-5 rounded border-input focus:ring-2 focus:ring-offset-2 focus:ring-ring",
            "bg-background transition-colors duration-200",
            item.completed && "bg-primary border-primary"
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
            className="flex-1 px-2 py-1 text-sm border border-input bg-background rounded focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <label
          htmlFor={item.id}
          className={cn(
            "flex-1 text-sm transition-all duration-200 cursor-pointer",
            item.completed
              ? "line-through text-muted-foreground"
              : "text-foreground"
          )}
        >
          {displayText}
        </label>
      )}

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-xs text-muted-foreground mr-1">#{index}</span>
        {!isEditing && onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEdit}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(item.id)}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// The exported component that handles plugin wrapping
export function ChecklistItem(props: ChecklistItemProps) {
  const { wrapComponent } = usePlugins();
  console.log('ChecklistItem: Applying plugins to item:', {
    id: props.item.id,
    text: props.item.text,
    pluginData: props.item.pluginData
  });

  const WrappedComponent = wrapComponent('ChecklistItem', BaseChecklistItem, props);
  console.log('ChecklistItem: Plugin wrapping complete, component:', WrappedComponent.displayName);

  return <WrappedComponent {...props} />;
}

// Add display name for debugging
BaseChecklistItem.displayName = 'BaseChecklistItem';