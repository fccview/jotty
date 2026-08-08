"use client";

import { useDragItem } from "@/app/_hooks/dnd";
import { Item, Checklist, KanbanStatus } from "@/app/_types";
import { cn } from "@/app/_utils/global-utils";
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { useState, useEffect, memo, useMemo, useCallback } from "react";
import { TaskStatus } from "@/app/_types/enums";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useKanbanItem } from "@/app/_hooks/kanban/useKanbanItem";
import {
  formatTimerTime,
  getStatusColor,
  getStatusIcon,
  getPriorityDotColor,
  getPriorityLabel,
} from "@/app/_utils/kanban/index";
import { TimeEntriesAccordion } from "./TimeEntriesAccordion";
import { KanbanItemTimer } from "./KanbanItemTimer";
import { KanbanItemContent } from "./KanbanItemContent";
import { getRecurrenceDescription } from "@/app/_utils/recurrence-utils";
import { usePermissions } from "@/app/_providers/PermissionsProvider";
import { formatReminderTime } from "@/app/_utils/kanban/reminder-utils";
import { CircleIcon, Notification03Icon, UserIcon } from "hugeicons-react";
import { usePreferredDateTime } from "@/app/_hooks/usePreferredDateTime";
import { useTranslations } from "next-intl";
import { UserAvatar } from "../../GlobalComponents/User/UserAvatar";
import { TimeEntriesModal } from "./TimeEntriesModal";

interface KanbanCardProps {
  checklist: Checklist;
  item: Item;
  index?: number;
  listId?: string;
  isDragging?: boolean;
  onUpdate: (updatedChecklist: Checklist) => void;
  onOpenDetail: (item: Item) => void;
  isShared: boolean;
  statuses: KanbanStatus[];
  statusColor?: string;
}

const KanbanCardComponent = ({
  checklist,
  item,
  index = 0,
  listId,
  isDragging,
  onUpdate,
  onOpenDetail,
  isShared,
  statuses,
  statusColor,
}: KanbanCardProps) => {
  const t = useTranslations();
  const { usersPublicData, user } = useAppMode();
  const { permissions } = usePermissions();
  const { formatDateString, formatDateTimeString, formatTimeString } =
    usePreferredDateTime();

  const getUserAvatarUrl = useCallback(
    (username: string) => {
      if (!usersPublicData) return "";
      return (
        usersPublicData.find(
          (user) => user.username?.toLowerCase() === username?.toLowerCase(),
        )?.avatarUrl || ""
      );
    },
    [usersPublicData],
  );

  const [showTimeEntriesModal, setShowTimeEntriesModal] = useState(false);
  const [showStatusSheet, setShowStatusSheet] = useState(false);
  const hideMobileStatusDropdown = user?.hideMobileStatusDropdown === "enable";
  const hideTimeTrackingOnCards = user?.hideTimeTrackingOnCards === "enable";

  const kanbanItemHook = useKanbanItem({
    checklist,
    item,
    onUpdate,
  });

  const { setNodeRef, handleProps, isLifted, isAway, style } = useDragItem({
    id: item.id,
    listId: listId || item.status || TaskStatus.TODO,
    index,
    disabled: kanbanItemHook.isEditing || !permissions?.canEdit,
    ghost: isDragging,
  });

  useEffect(() => {
    if (isLifted) {
      kanbanItemHook.stopTimerOnDrag();
    }
  }, [isLifted]);

  const statusOptions = useMemo(() => {
    const options = statuses?.map((status) => ({
      id: status.id,
      name: status.label,
      color: status.color,
      order: status.order,
      icon: CircleIcon,
    }));
    return options?.sort((a, b) => a.order - b.order);
  }, [statuses]);

  const handleMobileStatusChange = async (newStatus: string) => {
    await kanbanItemHook.handleStatusChange(newStatus);
    setShowStatusSheet(false);
  };

  return (
    <>
      {showStatusSheet && (
        <Modal
          isOpen={showStatusSheet}
          onClose={() => setShowStatusSheet(false)}
          title={t("kanban.changeStatus")}
        >
          <div className="space-y-2">
            {statusOptions.map((status) => {
              const isCurrent = status.id === (item.status || TaskStatus.TODO);
              return (
                <button
                  key={status.id}
                  type="button"
                  onClick={() => handleMobileStatusChange(status.id.toString())}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-jotty border text-left transition-colors",
                    isCurrent
                      ? "border-primary/50 bg-primary/5 text-foreground font-semibold"
                      : "border-border text-muted-foreground hover:border-primary/30 hover:bg-muted/50"
                  )}
                >
                  <span
                    className="h-3 w-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: status.color || "#6b7280" }}
                  />
                  <span className="text-sm">{status.name}</span>
                </button>
              );
            })}
          </div>
        </Modal>
      )}

      {showTimeEntriesModal && item.timeEntries && (
        <TimeEntriesModal
          isOpen={showTimeEntriesModal}
          onClose={() => setShowTimeEntriesModal(false)}
          timeEntries={item.timeEntries}
          checklistUuid={checklist.uuid || ""}
          itemId={item.id}
          onUpdate={onUpdate}
          usersPublicData={usersPublicData}
        />
      )}

      <div
        className={cn(
          "min-w-0",
          isLifted &&
            !isAway &&
            "rounded-jotty outline-dashed outline-2 -outline-offset-2 outline-primary/30",
        )}
      >
        <div
          ref={setNodeRef}
          style={style}
          {...handleProps}
          tabIndex={0}
          aria-label={item.text}
          onDoubleClick={() => onOpenDetail(item)}
          className={cn(
            "group bg-background border rounded-jotty p-3 transition-all duration-200 hover:shadow-md cursor-grab active:cursor-grabbing min-w-0",
            getStatusColor(item.status),
            isDragging &&
              "opacity-60 scale-[0.98] shadow-lg border-primary/40 z-50 transition-all duration-200",
            isLifted && "opacity-0 pointer-events-none",
          )}
        >
          <div className="space-y-2">
            <KanbanItemContent
              item={item}
              statuses={statuses}
              isEditing={kanbanItemHook.isEditing}
              editText={kanbanItemHook.editText}
              isShared={isShared}
              getUserAvatarUrl={getUserAvatarUrl}
              getStatusIcon={getStatusIcon}
              inputRef={kanbanItemHook.inputRef}
              onEditTextChange={kanbanItemHook.setEditText}
              onEditSave={kanbanItemHook.handleSave}
              onEditKeyDown={kanbanItemHook.handleKeyDown}
              onShowSubtaskModal={() => onOpenDetail(item)}
              onShowStatusMenu={() => setShowStatusSheet(true)}
              onEdit={kanbanItemHook.handleEdit}
              onDelete={kanbanItemHook.handleDelete}
              onArchive={kanbanItemHook.handleArchive}
              formatDateString={formatDateString}
              formatDateTimeString={formatDateTimeString}
            />

            <div className="flex flex-wrap gap-1.5">
              {item.priority && item.priority !== "none" && (
                <span className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded-jotty flex items-center gap-1",
                  item.priority === "critical" && "bg-destructive/10 text-destructive",
                  item.priority === "high" && "bg-warning/10 text-warning",
                  item.priority !== "critical" && item.priority !== "high" && "bg-muted text-muted-foreground"
                )}>
                  <span
                    className="w-2 h-2 rounded-jotty flex-shrink-0"
                    style={{
                      backgroundColor: getPriorityDotColor(item.priority),
                    }}
                  />
                  {getPriorityLabel(item.priority, t)}
                </span>
              )}

              {item.score !== undefined && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-jotty bg-muted text-muted-foreground">
                  {t("kanban.scoreLabel", { score: item.score })}
                </span>
              )}

              {item.reminder && !item.reminder.notified && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-jotty bg-muted text-muted-foreground flex items-center gap-0.5">
                  <span className="w-4 h-4 rounded-full bg-warning flex items-center justify-center">
                    <Notification03Icon className="h-2 w-2 text-white" />
                  </span>
                  {formatReminderTime(item.reminder.datetime)}
                </span>
              )}

              {item.assignee && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-jotty bg-muted text-muted-foreground flex items-center gap-0.5">
                  <UserAvatar
                    username={item.assignee}
                    size="xs"
                    avatarUrl={getUserAvatarUrl(item.assignee) || ""}
                  />
                  {item.assignee}
                </span>
              )}
            </div>

            {!hideTimeTrackingOnCards && (
              <>
                <KanbanItemTimer
                  totalTime={kanbanItemHook.totalTime}
                  currentTime={kanbanItemHook.currentTime}
                  isRunning={kanbanItemHook.isRunning}
                  formatTimerTime={formatTimerTime}
                  onTimerToggle={kanbanItemHook.handleTimerToggle}
                  onAddManualTime={kanbanItemHook.handleAddManualTime}
                />

                {item.timeEntries && item.timeEntries.length > 0 && (
                  <div onPointerDown={(e) => e.stopPropagation()}>
                    <TimeEntriesAccordion
                      timeEntries={item.timeEntries}
                      totalTime={
                        kanbanItemHook.totalTime + kanbanItemHook.currentTime
                      }
                      formatTimerTime={formatTimerTime}
                      usersPublicData={usersPublicData}
                      formatDateString={formatDateString}
                      formatTimeString={formatTimeString}
                      onOpenTimeEntries={() => setShowTimeEntriesModal(true)}
                    />
                  </div>
                )}
              </>
            )}

            {item.recurrence && (
              <div className="text-md lg:text-xs flex items-center gap-1 capitalize !mt-2 border bg-muted-foreground/5 border-muted-foreground/20 rounded-jotty p-2">
                <span className="text-muted-foreground/80">
                  Repeats {getRecurrenceDescription(item.recurrence)}
                </span>
              </div>
            )}

            {!hideMobileStatusDropdown && (
              <div
                className="lg:hidden"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <Dropdown
                  value={item.status || TaskStatus.TODO}
                  options={statusOptions}
                  onChange={(newStatus) =>
                    kanbanItemHook.handleStatusChange(newStatus as TaskStatus)
                  }
                  className="w-full text-sm"
                />
              </div>
            )}
          </div>
        </div>
      </div>
      <kanbanItemHook.DeleteModal />
    </>
  );
};

export const KanbanCard = memo(KanbanCardComponent);
