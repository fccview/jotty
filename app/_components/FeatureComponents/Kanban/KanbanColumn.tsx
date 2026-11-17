"use client";

import { memo, useState, useRef, useEffect } from "react";
import { useItemLinkSuggestions } from "@/app/_hooks/useItemLinkSuggestions";
import { ItemLinkPopup } from "@/app/_components/FeatureComponents/Checklists/Parts/Common/ItemLinkPopup";
import { useDropList } from "@/app/_hooks/dnd";
import { Item, Checklist, KanbanStatus } from "@/app/_types";
import { KanbanCard } from "./KanbanCard";
import { KanbanColumnFrame } from "./KanbanColumnFrame";
import { statusColor as columnColor } from "@/app/_consts/kanban";
import { useTranslations } from "next-intl";
import { Add01Icon, Archive02Icon } from "hugeicons-react";
import { Input } from "../../GlobalComponents/FormElements/Input";
import { ConfirmModal } from "../../GlobalComponents/Modals/ConfirmationModals/ConfirmModal";

interface KanbanColumnProps {
  checklist: Checklist;
  id: string;
  title: string;
  items: Item[];
  status: string;
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
  const linkSuggestions = useItemLinkSuggestions(text, setText, inputRef);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (linkSuggestions.handleKeyDown(e)) return;
    if (e.key === "Enter") {
      e.preventDefault();
      if (text.trim()) onSubmit(text.trim());
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <>
      <Input
        id="inline-add-input"
        ref={inputRef}
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
      <ItemLinkPopup suggestions={linkSuggestions} />
    </>
  );
};

const KanbanColumnComponent = ({
  checklist,
  id,
  title,
  items,
  status,
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

  const color = columnColor({ id: status, color: statusColor });

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

  const actions = (
    <>
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
    </>
  );

  return (
    <>
      <KanbanColumnFrame
        title={title}
        color={color}
        count={items.length}
        isEmpty={items.length === 0 && !showInlineInput}
        actions={actions}
        dropRef={setNodeRef}
        isOver={isOver}
        padBottom={padBottom}
      >
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
            onUpdate={onUpdate}
            onOpenDetail={onOpenDetail}
            isShared={isShared}
            statuses={statuses}
            statusColor={statusColor}
          />
        ))}
      </KanbanColumnFrame>
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
    </>
  );
};

export const KanbanColumn = memo(KanbanColumnComponent);
