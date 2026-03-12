"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Item, Checklist, KanbanStatus } from "@/app/_types";
import { cn } from "@/app/_utils/global-utils";
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { useState, useEffect, memo, useMemo, useCallback } from "react";
import { TaskStatus } from "@/app/_types/enums";
import { KanbanCardDetail } from "./KanbanCardDetail";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useKanbanItem } from "@/app/_hooks/kanban/useKanbanItem";
import {
  formatTimerTime,
  getStatusColor,
  getStatusIcon,
  getPriorityColor,
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

interface KanbanCardProps {
  checklist: Checklist;
  item: Item;
  isDragging?: boolean;
  checklistId: string;
  category: string;
  onUpdate: (updatedChecklist: Checklist) => void;
  isShared: boolean;
  statuses: KanbanStatus[];
}

const KanbanCardComponent = ({
  checklist,
  item,
  isDragging,
  checklistId,
  category,
  onUpdate,
  isShared,
  statuses,
}: KanbanCardProps) => {
  const t = useTranslations();
  const { usersPublicData } = useAppMode();
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

  const [showDetailModal, setShowDetailModal] = useState(false);

  const kanbanItemHook = useKanbanItem({
    checklist,
    item,
    checklistId,
    category,
    onUpdate,
  });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: item.id,
    disabled: kanbanItemHook.isEditing || !permissions?.canEdit,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (isSortableDragging) {
      kanbanItemHook.stopTimerOnDrag();
    }
  }, [isSortableDragging]);

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

  return (
    <>
      {showDetailModal && (
        <KanbanCardDetail
          checklist={checklist}
          item={item}
          isShared={isShared}
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          onUpdate={onUpdate}
          checklistId={checklistId}
          category={category}
        />
      )}

      <div>
        <div
          ref={setNodeRef}
          style={style}
          {...attributes}
          {...listeners}
          onDoubleClick={() => setShowDetailModal(true)}
          className={cn(
            "group bg-background border rounded-jotty p-3 transition-all duration-200 hover:shadow-md cursor-grab active:cursor-grabbing",
            getStatusColor(item.status),
            (isDragging || isSortableDragging) &&
              "opacity-50 scale-95 rotate-[4deg] shadow-lg z-50 transition-all duration-200",
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
              onShowSubtaskModal={() => setShowDetailModal(true)}
              onEdit={kanbanItemHook.handleEdit}
              onDelete={kanbanItemHook.handleDelete}
              onArchive={kanbanItemHook.handleArchive}
              formatDateString={formatDateString}
              formatDateTimeString={formatDateTimeString}
            />

            <div className="flex flex-wrap gap-1.5">
              {item.priority && item.priority !== "none" && (
                <span
                  className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                    getPriorityColor(item.priority),
                  )}
                >
                  {getPriorityLabel(item.priority, t)}
                </span>
              )}

              {item.score !== undefined && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {t("kanban.scoreLabel", { score: item.score })}
                </span>
              )}

              {item.assignee && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-0.5">
                  <UserIcon className="h-2.5 w-2.5" />
                  {item.assignee}
                </span>
              )}

              {item.reminder && !item.reminder.notified && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 flex items-center gap-0.5">
                  <Notification03Icon className="h-2.5 w-2.5" />
                  {formatReminderTime(item.reminder.datetime)}
                </span>
              )}
            </div>

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
                />
              </div>
            )}

            {item.recurrence && (
              <div className="text-md lg:text-xs flex items-center gap-1 capitalize !mt-2 border bg-muted-foreground/5 border-muted-foreground/20 rounded-jotty p-2">
                <span className="text-muted-foreground/80">
                  Repeats {getRecurrenceDescription(item.recurrence)}
                </span>
              </div>
            )}

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
          </div>
        </div>
      </div>
      <kanbanItemHook.DeleteModal />
    </>
  );
};

export const KanbanCard = memo(KanbanCardComponent);
