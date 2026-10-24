"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { FloppyDiskIcon, MultiplicationSignIcon } from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { ItemLinkPopup } from "@/app/_components/FeatureComponents/Checklists/Parts/Common/ItemLinkPopup";
import { UnifiedMarkdownRenderer } from "@/app/_components/FeatureComponents/Notes/Parts/UnifiedMarkdownRenderer";
import { useItemLinkSuggestions } from "@/app/_hooks/useItemLinkSuggestions";
import { NOTE_PROSE_CLASS } from "@/app/_consts/notes";
import { cn } from "@/app/_utils/global-utils";
import { TaskDescriptionEditor } from "./TaskDescriptionEditor";

interface KanbanCardDescriptionProps {
  boardUuid: string;
  markdown: string;
  canEdit: boolean;
  isEditing: boolean;
  title: string;
  description: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export const KanbanCardDescription = ({
  boardUuid,
  markdown,
  canEdit,
  isEditing,
  title,
  description,
  onTitleChange,
  onDescriptionChange,
  onEdit,
  onSave,
  onCancel,
}: KanbanCardDescriptionProps) => {
  const t = useTranslations();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const titleLinks = useItemLinkSuggestions(title, onTitleChange, titleInputRef);

  if (!isEditing) {
    return (
      <div
        className={cn(
          "bg-card border border-border rounded-jotty p-4 shadow-sm",
          canEdit && "cursor-pointer",
        )}
        onClick={() => canEdit && onEdit()}
      >
        {markdown ? (
          <UnifiedMarkdownRenderer
            content={markdown}
            className={`text-card-foreground ${NOTE_PROSE_CLASS}`}
            showStats={false}
          />
        ) : (
          <p className="text-muted-foreground text-sm opacity-50">
            {t("checklists.noDescription")}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          {t("kanban.itemTitle")}
        </label>
        <input
          ref={titleInputRef}
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-full px-3 py-2 bg-background border border-input rounded-jotty focus:outline-none focus:border-ring transition-all text-base"
          placeholder={t("checklists.enterTaskTitle")}
          onKeyDown={(e) => {
            if (titleLinks.handleKeyDown(e)) return;
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSave();
            } else if (e.key === "Escape") {
              e.preventDefault();
              onCancel();
            }
          }}
        />
        <ItemLinkPopup suggestions={titleLinks} />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          {t("common.description")}
        </label>
        <TaskDescriptionEditor
          boardUuid={boardUuid}
          content={description}
          onContentChange={onDescriptionChange}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          <MultiplicationSignIcon className="h-4 w-4 mr-2" />
          {t("common.cancel")}
        </Button>
        <Button onClick={onSave}>
          <FloppyDiskIcon className="h-4 w-4 mr-2" />
          {t("admin.saveChanges")}
        </Button>
      </div>
    </div>
  );
};
