"use client";

import { memo } from "react";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import { DropdownMenu } from "@/app/_components/GlobalComponents/Dropdowns/DropdownMenu";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Item, KanbanStatus } from "@/app/_types";
import { usePermissions } from "@/app/_providers/PermissionsProvider";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useTranslations } from "next-intl";
import { KanbanCardHead } from "./KanbanCardHead";
import { useToast } from "@/app/_providers/ToastProvider";
import { copyTextToClipboard } from "@/app/_utils/global-utils";
import {
  Archive02Icon,
  ArrowDataTransferHorizontalIcon,
  Delete03Icon,
  GridIcon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  TaskAdd01Icon,
  ViewIcon,
} from "hugeicons-react";

interface KanbanItemContentProps {
  item: Item;
  isEditing: boolean;
  statuses: KanbanStatus[];
  editText: string;
  isShared: boolean;
  getUserAvatarUrl: (username: string) => string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  contextTarget: React.RefObject<HTMLElement | null>;
  onEditTextChange: (text: string) => void;
  onEditSave: () => void;
  onEditKeyDown: (e: React.KeyboardEvent) => void;
  onShowSubtaskModal: () => void;
  onShowStatusMenu: () => void;
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
  inputRef,
  contextTarget,
  onEditTextChange,
  onEditSave,
  onEditKeyDown,
  onShowSubtaskModal,
  onShowStatusMenu,
  onEdit,
  onDelete,
  onArchive,
  formatDateString,
  formatDateTimeString,
}: KanbanItemContentProps) => {
  const { permissions } = usePermissions();
  const { user, tagsEnabled } = useAppMode();
  const t = useTranslations();
  const { showToast } = useToast();
  const hideStatus = user?.hideStatusOnCards === "enable";

  const copyId = async () => {
    const copied = await copyTextToClipboard(item.id);
    showToast(copied ? { type: "success", title: t("common.copied") } : { type: "error", title: t("common.copyFailed") });
  };

  const editActions = permissions?.canEdit
    ? [
        { label: t("kanban.changeStatus"), onClick: onShowStatusMenu, icon: <ArrowDataTransferHorizontalIcon className="h-4 w-4" /> },
        { label: t("tasks.addSubtask"), onClick: onShowSubtaskModal, icon: <TaskAdd01Icon className="h-4 w-4" /> },
        { label: t("tasks.renameTask"), onClick: onEdit, icon: <PencilEdit02Icon className="h-4 w-4" /> },
      ]
    : [];

  const removalActions = [
    ...(permissions?.canEdit
      ? [{ label: t("tasks.archiveTask"), onClick: onArchive, icon: <Archive02Icon className="h-4 w-4" /> }]
      : []),
    ...(permissions?.canDelete
      ? [{ label: t("tasks.deleteTask"), onClick: onDelete, variant: "destructive" as const, icon: <Delete03Icon className="h-4 w-4" /> }]
      : []),
  ];

  const menuItems = [
    { label: t("tasks.viewTask"), onClick: onShowSubtaskModal, icon: <ViewIcon className="h-4 w-4" /> },
    { label: t("kanban.copyId"), onClick: copyId, icon: <GridIcon className="h-4 w-4" /> },
    { type: "divider" as const },
    ...editActions,
    { type: "divider" as const },
    ...removalActions,
  ];

  return (
    <KanbanCardHead
      item={item}
      statuses={statuses}
      tagsEnabled={tagsEnabled}
      hideStatus={hideStatus}
      onOpen={onShowSubtaskModal}
      leading={
        item.createdBy && isShared ? (
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
        ) : null
      }
      editor={
        isEditing ? (
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
        ) : null
      }
      menu={
        <DropdownMenu
          contextTarget={contextTarget}
          align="right"
          items={menuItems}
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              aria-label={t("common.moreOptions")}
            >
              <MoreHorizontalIcon className="h-4 w-4" />
            </Button>
          }
        />
      }
      aside={
        item.lastModifiedBy && isShared ? (
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
        ) : null
      }
    />
  );
};

export const KanbanItemContent = memo(KanbanItemContentComponent);
