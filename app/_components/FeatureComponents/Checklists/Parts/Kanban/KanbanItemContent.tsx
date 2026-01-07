"use client";

import { memo } from "react";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { ProgressBar } from "@/app/_components/GlobalComponents/Statistics/ProgressBar";
import { Item, KanbanStatus } from "@/app/_types";
import { TaskStatusLabels } from "@/app/_types/enums";
import { usePermissions } from "@/app/_providers/PermissionsProvider";
import { useTranslations } from "next-intl";

interface KanbanItemContentProps {
  item: Item;
  isEditing: boolean;
  statuses: KanbanStatus[];
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
  onArchive: () => void;
  formatDateString: (dateString: string) => string;
  formatDateTimeString: (dateString: string) => string;
}

const KanbanItemContentComponent = ({
  item,
  isEditing,
  statuses,
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
  onArchive,
  formatDateString,
  formatDateTimeString,
}: KanbanItemContentProps) => {
  const { permissions } = usePermissions();
  const t = useTranslations();

  const getStatusLabel = (status?: string) => {
    if (!status) return TaskStatusLabels.TODO;

    return statuses.find((s: KanbanStatus) => s.id === status)?.label;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {item.createdBy && isShared && (
            <div
              className="flex-shrink-0"
              title={t("common.createdBy", { user: item.createdBy })}
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
              className="w-full text-md lg:text-sm font-medium text-foreground leading-tight bg-transparent border-none outline-none resize-none"
            />
          ) : (
            <p
              className="text-md lg:text-sm font-medium text-foreground leading-tight truncate cursor-pointer"
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
          <Dropdown
            value=""
            options={[
              { id: "view", name: t("tasks.viewTask") },
              ...(permissions?.canEdit
                ? [{ id: "add", name: t("tasks.addSubtask") }]
                : []),
              ...(permissions?.canEdit
                ? [{ id: "rename", name: t("tasks.renameTask") }]
                : []),
              ...(permissions?.canEdit
                ? [{ id: "archive", name: t("tasks.archiveTask") }]
                : []),
              ...(permissions?.canDelete
                ? [{ id: "delete", name: t("tasks.deleteTask") }]
                : []),
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
                case "archive":
                  onArchive();
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

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {getStatusIcon(item.status)}
          <span>{getStatusLabel(item.status)}</span>
        </div>
        {item.lastModifiedBy && isShared && (
          <div
            className="flex items-center gap-1"
            title={item.lastModifiedAt
              ? t("common.lastModifiedByOn", {
                  user: item.lastModifiedBy,
                  date: formatDateTimeString(item.lastModifiedAt)
                })
              : t("common.lastModifiedBy", { user: item.lastModifiedBy })
            }
          >
            <UserAvatar
              username={item.lastModifiedBy}
              size="xs"
              avatarUrl={getUserAvatarUrl(item.lastModifiedBy) || ""}
            />
            <span className="text-[10px] text-muted-foreground">
              {item.lastModifiedAt ? formatDateString(item.lastModifiedAt) : ""}
            </span>
          </div>
        )}
      </div>

      {item.children && item.children.length > 0 && (
        <>
          <div className="flex items-center justify-between text-sm lg:text-xs text-muted-foreground">
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

export const KanbanItemContent = memo(KanbanItemContentComponent);
