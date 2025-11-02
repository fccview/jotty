"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Item, Checklist } from "@/app/_types";
import { cn } from "@/app/_utils/global-utils";
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { useState, useEffect } from "react";
import { TaskStatus, TaskStatusLabels } from "@/app/_types/enums";
import { SubtaskModal } from "./SubtaskModal";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useKanbanItem } from "@/app/_hooks/useKanbanItem";
import {
  formatTimerTime,
  getStatusColor,
  getStatusIcon,
} from "@/app/_utils/kanban-utils";
import { TimeEntriesAccordion } from "./TimeEntriesAccordion";
import { KanbanItemTimer } from "./KanbanItemTimer";
import { KanbanItemContent } from "./KanbanItemContent";
import { getRecurrenceDescription } from "@/app/_utils/recurrence-utils";
import { usePermissions } from "@/app/_providers/PermissionsProvider";

interface KanbanItemProps {
  checklist: Checklist;
  item: Item;
  isDragging?: boolean;
  checklistId: string;
  category: string;
  onUpdate: (updatedChecklist: Checklist) => void;
  isShared: boolean;
}

export const KanbanItem = ({
  checklist,
  item,
  isDragging,
  checklistId,
  category,
  onUpdate,
  isShared,
}: KanbanItemProps) => {
  const { usersPublicData } = useAppMode();
  const { permissions } = usePermissions();

  const getUserAvatarUrl = (username: string) => {
    if (!usersPublicData) return "";

    return (
      usersPublicData.find(
        (user) => user.username?.toLowerCase() === username?.toLowerCase()
      )?.avatarUrl || ""
    );
  };

  const [showSubtaskModal, setShowSubtaskModal] = useState(false);

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
    disabled: kanbanItemHook.isEditing,
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

  const statusOptions = [
    { id: TaskStatus.TODO, name: TaskStatusLabels.TODO },
    { id: TaskStatus.IN_PROGRESS, name: TaskStatusLabels.IN_PROGRESS },
    { id: TaskStatus.COMPLETED, name: TaskStatusLabels.COMPLETED },
    { id: TaskStatus.PAUSED, name: TaskStatusLabels.PAUSED },
  ];

  return (
    <>
      {showSubtaskModal && (
        <SubtaskModal
          checklist={checklist}
          item={item}
          isShared={isShared}
          isOpen={showSubtaskModal}
          onClose={() => setShowSubtaskModal(false)}
          onUpdate={onUpdate}
          checklistId={checklistId}
          category={category}
        />
      )}

      <div className="relative">
        <div
          ref={setNodeRef}
          style={style}
          {...attributes}
          {...listeners}
          onDoubleClick={() => setShowSubtaskModal(true)}
          className={cn(
            "group relative bg-background border rounded-lg p-3 transition-all duration-200 hover:shadow-md cursor-grab active:cursor-grabbing",
            getStatusColor(item.status),
            (isDragging || isSortableDragging) &&
              "opacity-50 scale-95 rotate-1 shadow-lg z-50"
          )}
        >
          <div className="space-y-2">
            <KanbanItemContent
              item={item}
              isEditing={kanbanItemHook.isEditing}
              editText={kanbanItemHook.editText}
              isShared={isShared}
              getUserAvatarUrl={getUserAvatarUrl}
              getStatusIcon={getStatusIcon}
              inputRef={kanbanItemHook.inputRef}
              onEditTextChange={kanbanItemHook.setEditText}
              onEditSave={kanbanItemHook.handleSave}
              onEditKeyDown={kanbanItemHook.handleKeyDown}
              onShowSubtaskModal={() => setShowSubtaskModal(true)}
              onEdit={kanbanItemHook.handleEdit}
              onDelete={kanbanItemHook.handleDelete}
            />

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
                />
              </div>
            )}

            {item.recurrence && (
              <div className="text-xs flex items-center gap-1 capitalize !mt-2 border bg-muted-foreground/5 border-muted-foreground/20 rounded-md p-2">
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
    </>
  );
};
