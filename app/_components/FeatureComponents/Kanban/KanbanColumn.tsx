"use client";

import { useMemo, memo, useState, useRef, useEffect } from "react";
import { useDropList } from "@/app/_hooks/dnd";
import { Item, Checklist, KanbanStatus } from "@/app/_types";
import { KanbanCard } from "./KanbanCard";
import { cn } from "@/app/_utils/global-utils";
import { TaskStatus } from "@/app/_types/enums";
import { useTranslations } from "next-intl";
import { TaskDaily01Icon, Add01Icon, Archive02Icon } from "hugeicons-react";
import { Input } from "../../GlobalComponents/FormElements/Input";
import { ConfirmModal } from "../../GlobalComponents/Modals/ConfirmationModals/ConfirmModal";

interface KanbanColumnProps {
  checklist: Checklist;
  id: string;
  title: string;
  items: Item[];
  status: string;
  checklistId: string;
  category: string;
  onUpdate: (updatedChecklist: Checklist) => void;
  onOpenDetail: (item: Item) => void;
  isShared: boolean;
  statusColor?: string;
  statuses: KanbanStatus[];
  onAddItem?: (status: string) => Promise<void>;
  archivableCount?: number;
  onArchiveAll?: () => Promise<void>;
}

interface InlineAddInputProps {
  onSubmit: (text: string) => void;
  onCancel: () => void;
  placeholder: string;
  isLoading?: boolean;
}

const InlineAddInput = ({
  onSubmit,
  onCancel,
  placeholder,
  isLoading,
}: InlineAddInputProps) => {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (text.trim()) onSubmit(text.trim());
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <Input
      id="inline-add-input"
      type="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => {
        if (!text.trim()) onCancel();
      }}
      placeholder={placeholder}
      disabled={isLoading}
    />
  );
};

const KanbanColumnComponent = ({
  checklist,
  id,
  title,
  items,
  status,
  checklistId,
  category,
  isShared,
  onUpdate,
  onOpenDetail,
  statusColor,
  statuses,
  onAddItem,
  archivableCount = items.length,
  onArchiveAll,
}: KanbanColumnProps) => {
  const t = useTranslations();
  const { setNodeRef, isOver, padBottom } = useDropList({ id });
  const [showInlineInput, setShowInlineInput] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [showArchiveAllModal, setShowArchiveAllModal] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const currentStatus = statuses.find((s) => s.id === status);
  const isAutoComplete = currentStatus?.autoComplete === true;

  const defaultColors: Record<string, string> = useMemo(
    () => ({
      [TaskStatus.TODO]: "#6b7280",
      [TaskStatus.IN_PROGRESS]: "#3b82f6",
      [TaskStatus.COMPLETED]: "#10b981",
      [TaskStatus.PAUSED]: "#f59e0b",
    }),
    [],
  );

  const color = statusColor || defaultColors[status] || "#6b7280";

  const { borderColor, bgColor } = useMemo(() => {
    const _hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : null;
    };

    const rgb = _hexToRgb(color);
    return {
      borderColor: rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)` : color,
      bgColor: rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05)` : color,
    };
  }, [color]);

  const handleInlineSubmit = async (text: string) => {
    if (!onAddItem) return;
    setIsAddingItem(true);
    setShowInlineInput(false);
    await onAddItem(text);
    setIsAddingItem(false);
  };

  const handleArchiveAll = async () => {
    if (!onArchiveAll || archivableCount === 0) return;
    setIsArchiving(true);
    try {
      await onArchiveAll();
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div className="flex flex-col h-full my-4 lg:my-0 min-w-0">
      <div className="flex items-center justify-between mb-3 min-w-0">
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <h3 className="font-medium text-md lg:text-sm text-foreground truncate">
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onAddItem && !isAutoComplete && (
            <button
              onClick={() => setShowInlineInput(true)}
              title={t("kanban.addItemToColumn", { column: title })}
              aria-label={t("kanban.addItemToColumn", { column: title })}
              disabled={isAddingItem || showInlineInput}
              className="flex items-center justify-center h-5 w-5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Add01Icon className="h-3.5 w-3.5" />
            </button>
          )}
          {onArchiveAll && isAutoComplete && (
            <button
              onClick={() => setShowArchiveAllModal(true)}
              title={t("kanban.archiveAllItemsInColumn", { column: title })}
              aria-label={t("kanban.archiveAllItemsInColumn", { column: title })}
              disabled={archivableCount === 0 || isArchiving}
              className="flex items-center justify-center h-5 w-5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Archive02Icon className="h-3.5 w-3.5" />
            </button>
          )}
          <span className="text-md lg:text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            {items.length}
          </span>
        </div>
      </div>

      <div
        ref={setNodeRef}
        aria-label={`${title} column`}
        className={cn(
          "flex-1 min-w-0 rounded-jotty border-2 border-dashed p-3 min-h-[200px] transition-colors duration-200",
          isOver && "border-primary/70 bg-primary/10 shadow-md",
        )}
        style={{
          borderColor: isOver ? undefined : borderColor,
          backgroundColor: isOver ? undefined : bgColor,
          paddingBottom: padBottom
            ? `calc(0.75rem + ${padBottom}px)`
            : undefined,
        }}
      >
        <div className="space-y-2">
          {showInlineInput && (
            <InlineAddInput
              onSubmit={handleInlineSubmit}
              onCancel={() => setShowInlineInput(false)}
              placeholder={t("kanban.addItemPlaceholder")}
            />
          )}
          {items.map((item, index) => (
            <KanbanCard
              checklist={checklist}
              key={item.id}
              item={item}
              index={index}
              listId={status}
              checklistId={checklistId}
              category={category}
              onUpdate={onUpdate}
              onOpenDetail={onOpenDetail}
              isShared={isShared}
              statuses={statuses}
              statusColor={statusColor}
            />
          ))}
          {items.length === 0 && !showInlineInput && (
            <div className="flex flex-col items-center justify-center text-muted-foreground/50 py-8 gap-2">
              <TaskDaily01Icon className="h-8 w-8" />
              <span className="text-md lg:text-sm">
                {t("checklists.noTasks")}
              </span>
            </div>
          )}
        </div>
      </div>
      <ConfirmModal
        isOpen={showArchiveAllModal}
        onClose={() => setShowArchiveAllModal(false)}
        onConfirm={handleArchiveAll}
        title={t("kanban.archiveAllConfirmTitle")}
        message={t("kanban.archiveAllConfirmMessage", {
          count: archivableCount,
          column: title,
        })}
        confirmText={t("common.archive")}
        variant="destructive"
      />
    </div>
  );
};

export const KanbanColumn = memo(KanbanColumnComponent);
