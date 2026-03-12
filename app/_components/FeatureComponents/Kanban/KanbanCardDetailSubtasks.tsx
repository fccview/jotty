"use client";

import { useState } from "react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Item, Checklist } from "@/app/_types";
import { NestedChecklistItem } from "@/app/_components/FeatureComponents/Checklists/Parts/Simple/NestedChecklistItem";
import { Add01Icon } from "hugeicons-react";
import { useTranslations } from "next-intl";

interface KanbanCardDetailSubtasksProps {
  item: Item;
  checklist: Checklist;
  canEdit: boolean;
  onToggle: (subtaskId: string, completed: boolean) => void;
  onEdit: (subtaskId: string, text: string) => void;
  onDelete: (subtaskId: string) => void;
  onAddSubtask: (text: string) => void;
  onAddNestedSubtask: (parentId: string, text: string) => void;
  onToggleAll: (completed: boolean) => void;
}

export const KanbanCardDetailSubtasks = ({
  item,
  checklist,
  canEdit,
  onToggle,
  onEdit,
  onDelete,
  onAddSubtask,
  onAddNestedSubtask,
  onToggleAll,
}: KanbanCardDetailSubtasksProps) => {
  const t = useTranslations();
  const [newSubtaskText, setNewSubtaskText] = useState("");

  const handleAdd = () => {
    if (!newSubtaskText.trim()) return;
    onAddSubtask(newSubtaskText.trim());
    setNewSubtaskText("");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          {t("checklists.subtasks")}
          {item.children?.length ? (
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {item.children.filter((s) => s.completed).length} /{" "}
              {item.children.length}
            </span>
          ) : null}
        </h4>
        {canEdit && item.children?.length ? (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleAll(true)}
              className="text-xs"
            >
              {t("common.completeAll")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleAll(false)}
              className="text-xs"
            >
              {t("common.resetAll")}
            </Button>
          </div>
        ) : null}
      </div>

      {item.children?.length ? (
        <div className="space-y-2 mb-3 bg-background-secondary/50 rounded-jotty p-3 border border-border/50">
          {item.children.map((subtask, index) => (
            <NestedChecklistItem
              isSubtask={true}
              key={subtask.id}
              item={subtask}
              index={index.toString()}
              level={1}
              onToggle={onToggle}
              onDelete={onDelete}
              onEdit={onEdit}
              onAddSubItem={onAddNestedSubtask}
              isDeletingItem={false}
              isDragDisabled={true}
              checklist={checklist}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground text-sm bg-muted/20 rounded-jotty border border-dashed border-border mb-3">
          {t("checklists.noSubtasksYet")}
        </div>
      )}

      {canEdit && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newSubtaskText}
            onChange={(e) => setNewSubtaskText(e.target.value)}
            placeholder={t("checklists.addSubtask")}
            className="flex-1 px-3 py-2 text-sm bg-background border border-input rounded-jotty focus:outline-none focus:border-ring transition-all"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <Button
            onClick={handleAdd}
            disabled={!newSubtaskText.trim()}
            title={t("checklists.addSubItem")}
          >
            <Add01Icon className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
