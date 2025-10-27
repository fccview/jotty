"use client";

import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { ProgressBar } from "@/app/_components/GlobalComponents/Statistics/ProgressBar";
import { Item } from "@/app/_types";
import { TaskStatus, TaskStatusLabels } from "@/app/_types/enums";
import { useTranslations } from "next-intl";

interface KanbanItemContentProps {
  item: Item;
  isEditing: boolean;
  editText: string;
  isShared: boolean;
  getUserAvatarUrl: (username: string) => string;
  getStatusIcon: (status?: string) => JSX.Element | null;
  inputRef: React.RefObject<HTMLInputElement>;
  onEditTextChange: (text: string) => void;
  onEditSave: () => void;
  onEditKeyDown: (e: React.KeyboardEvent) => void;
  onShowSubtaskModal: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const KanbanItemContent = ({
  item,
  isEditing,
  editText,
  isShared,
  getUserAvatarUrl,
  getStatusIcon,
  inputRef,
  onEditTextChange,
  onEditSave,
  onEditKeyDown,
  onShowSubtaskModal,
  onEdit,
  onDelete,
}: KanbanItemContentProps) => {
  const t = useTranslations();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {item.createdBy && isShared && (
            <div
              className="flex-shrink-0"
              title={t("checklists.created_by", { username: item.createdBy })}
            >
              <UserAvatar
                username={item.createdBy}
                size="xs"
                avatarUrl={getUserAvatarUrl(item.createdBy) || ""}
              />
            </div>
          )}
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editText}
              onChange={(e) => onEditTextChange(e.target.value)}
              onBlur={onEditSave}
              onKeyDown={onEditKeyDown}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="w-full text-sm font-medium text-foreground leading-tight bg-transparent border-none outline-none resize-none"
            />
          ) : (
            <p
              className="text-sm font-medium text-foreground leading-tight truncate cursor-pointer"
              title={item.text}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => onShowSubtaskModal()}
              onClick={(e) => onShowSubtaskModal()}
            >
              {item.text}
            </p>
          )}
        </div>

        <div
          className="flex items-center"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="relative">
            <Dropdown
              value=""
              options={[
                { id: "view", name: t("checklists.view_task") },
                { id: "add", name: t("checklists.add_subtask") },
                { id: "rename", name: t("checklists.rename_task") },
                { id: "delete", name: t("checklists.delete_task") },
              ]}
              onChange={(action) => {
                switch (action) {
                  case "view":
                    onShowSubtaskModal();
                    break;
                  case "add":
                    onShowSubtaskModal();
                    break;
                  case "rename":
                    onEdit();
                    break;
                  case "delete":
                    onDelete();
                    break;
                }
              }}
              iconDropdown
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {getStatusIcon(item.status)}
          <span>
            {item.status === TaskStatus.TODO && TaskStatusLabels.TODO}
            {item.status === TaskStatus.IN_PROGRESS &&
              TaskStatusLabels.IN_PROGRESS}
            {item.status === TaskStatus.COMPLETED && TaskStatusLabels.COMPLETED}
            {item.status === TaskStatus.PAUSED && TaskStatusLabels.PAUSED}
            {!item.status && TaskStatusLabels.TODO}
          </span>
        </div>
        {item.lastModifiedBy && isShared && (
          <div
            className="flex items-center gap-1"
            title={`${t("checklists.last_modified_by", { username: item.lastModifiedBy })}${item.lastModifiedAt
                ? t("checklists.last_modified_on", { date: new Date(item.lastModifiedAt).toLocaleString() })
                : ""
              }`}
          >
            <UserAvatar
              username={item.lastModifiedBy}
              size="xs"
              avatarUrl={getUserAvatarUrl(item.lastModifiedBy) || ""}
            />
            <span className="text-[10px] text-muted-foreground">
              {item.lastModifiedAt
                ? new Date(item.lastModifiedAt).toLocaleDateString()
                : ""}
            </span>
          </div>
        )}
      </div>

      {item.children && item.children.length > 0 && (
        <>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("checklists.subtasks")}</span>
            <span>
              {item.children.filter((c) => c.completed).length}/
              {item.children.length}
            </span>
          </div>
          <ProgressBar
            progress={Math.round(
              (item.children.filter((c) => c.completed).length /
                item.children.length) *
              100
            )}
          />
        </>
      )}
    </div>
  );
};
