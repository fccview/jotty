"use client";

import { useState, useEffect, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { Checklist, KanbanStatus } from "@/app/_types";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { ChecklistHeading } from "../Checklists/Parts/Common/ChecklistHeading";
import { BulkPasteModal } from "@/app/_components/GlobalComponents/Modals/BulkPasteModal/BulkPasteModal";
import { StatusManager } from "./StatusManager";
import { ArchivedItems } from "./ArchivedItems";
import { useKanbanBoard } from "@/app/_hooks/kanban/useKanban";
import { useKanbanReminders } from "@/app/_hooks/kanban/useKanbanReminders";
import { ItemTypes, TaskStatus, TaskStatusLabels } from "@/app/_types/enums";
import { ReferencedBySection } from "../Notes/Parts/ReferencedBySection";
import { getReferences } from "@/app/_utils/indexes-utils";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { encodeCategoryPath } from "@/app/_utils/global-utils";
import { usePermissions } from "@/app/_providers/PermissionsProvider";
import { Settings01Icon, Archive02Icon, Calendar03Icon, TaskDaily01Icon } from "hugeicons-react";
import { CalendarView } from "./CalendarView";
import { KanbanCardDetail } from "./KanbanCardDetail";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { updateChecklistStatuses } from "@/app/_server/actions/checklist";
import { unarchiveItem } from "@/app/_server/actions/checklist-item";
import { useTranslations } from "next-intl";
import { DEFAULT_KANBAN_STATUSES } from "@/app/_consts/kanban";

interface KanbanBoardProps {
  checklist: Checklist;
  onUpdate: (updatedChecklist: Checklist) => void;
}

export const Kanban = ({ checklist, onUpdate }: KanbanBoardProps) => {
  const t = useTranslations();
  const [isClient, setIsClient] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showArchivedModal, setShowArchivedModal] = useState(false);
  const [viewMode, setViewMode] = useState<"board" | "calendar">("board");
  const [calendarSelectedItem, setCalendarSelectedItem] = useState<import("@/app/_types").Item | null>(null);
  const { linkIndex, notes, checklists, appSettings, allSharedItems } =
    useAppMode();
  const encodedCategory = encodeCategoryPath(
    checklist.category || "Uncategorized"
  );
  const isShared =
    allSharedItems?.checklists.some(
      (sharedChecklist) =>
        sharedChecklist.id === checklist.id &&
        sharedChecklist.category === encodedCategory
    ) || false;
  const { permissions } = usePermissions();
  const {
    localChecklist,
    isLoading,
    showBulkPasteModal,
    setShowBulkPasteModal,
    focusKey,
    refreshChecklist,
    handleItemUpdate,
    getItemsByStatus,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleAddItem,
    handleBulkPaste,
    handleItemStatusUpdate,
    activeItem,
  } = useKanbanBoard({ checklist, onUpdate });

  useKanbanReminders({
    checklist: localChecklist,
    checklistId: localChecklist.id,
    category: localChecklist.category || "Uncategorized",
    onUpdate: handleItemUpdate,
  });

  const statuses = useMemo(() => {
    const currentStatuses = localChecklist.statuses || DEFAULT_KANBAN_STATUSES;
    return currentStatuses.map(status => {
      if (status.id === TaskStatus.COMPLETED && status.autoComplete === undefined) {
        return { ...status, autoComplete: true };
      }
      return status;
    });
  }, [localChecklist.statuses]);

  const columns = statuses
    .sort((a, b) => a.order - b.order)
    .map((status) => ({
      id: status.id,
      title: status.label,
      status: status.id,
    }));

  const handleSaveStatuses = async (newStatuses: KanbanStatus[]) => {
    const formData = new FormData();
    formData.append("uuid", localChecklist.uuid || "");
    formData.append("statusesStr", JSON.stringify(newStatuses));

    const result = await updateChecklistStatuses(formData);
    if (result.success && result.data) {
      onUpdate(result.data);
      await refreshChecklist();
    }
  };

  const itemsByStatus = statuses.reduce((acc, status) => {
    acc[status.id] = localChecklist.items.filter(
      (item) => item.status === status.id && !item.isArchived
    ).length;
    return acc;
  }, {} as Record<string, number>);

  const archivedItems = localChecklist.items.filter((item) => item.isArchived);

  const handleUnarchive = async (itemId: string) => {
    const formData = new FormData();
    formData.append("listId", localChecklist.id);
    formData.append("itemId", itemId);
    formData.append("category", localChecklist.category || "Uncategorized");

    const result = await unarchiveItem(formData);
    if (result.success && result.data) {
      onUpdate(result.data);
      await refreshChecklist();
    }
  };

  const handleToggleItem = async (itemId: string, completed: boolean) => {
    const newStatus = completed ? TaskStatus.COMPLETED : TaskStatus.TODO;
    await handleItemStatusUpdate(itemId, newStatus);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
        delay: 100,
        tolerance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    setIsClient(true);
  }, []);

  const referencingItems = useMemo(() => {
    return getReferences(
      linkIndex,
      localChecklist.uuid,
      localChecklist.category,
      ItemTypes.CHECKLIST,
      notes,
      checklists
    );
  }, [
    linkIndex,
    localChecklist.uuid,
    localChecklist.category,
    checklists,
    notes,
  ]);

  return (
    <div className="h-full flex flex-col bg-background overflow-y-auto jotty-scrollable-content">
      {permissions?.canEdit && (
        <ChecklistHeading
          key={focusKey}
          checklist={checklist}
          onSubmit={handleAddItem}
          onToggleCompletedItem={handleToggleItem}
          onBulkSubmit={() => setShowBulkPasteModal(true)}
          isLoading={isLoading}
          autoFocus={true}
          focusKey={focusKey}
          placeholder={t("checklists.addNewTask")}
          submitButtonText={t("kanban.addItem")}
        />
      )}
      <div className="flex gap-2 px-4 pt-4 pb-2 w-full justify-end">
        <div className="flex gap-1 border border-border rounded-jotty p-0.5 mr-auto">
          <Button
            variant={viewMode === "board" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("board")}
            className="text-md lg:text-xs h-7"
          >
            <TaskDaily01Icon className="h-3 w-3 mr-1" />
            {t("kanban.title")}
          </Button>
          <Button
            variant={viewMode === "calendar" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("calendar")}
            className="text-md lg:text-xs h-7"
          >
            <Calendar03Icon className="h-3 w-3 mr-1" />
            {t("kanban.calendar")}
          </Button>
        </div>
        {permissions?.canEdit && viewMode === "board" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStatusModal(true)}
            className="text-md lg:text-xs"
          >
            <Settings01Icon className="h-3 w-3 mr-1" />
            {t("kanban.manageStatuses")}
          </Button>
        )}
        {viewMode === "board" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowArchivedModal(true)}
            className="text-md lg:text-xs"
          >
            <Archive02Icon className="h-3 w-3 mr-1" />
            {t("kanban.viewArchived")}
          </Button>
        )}
      </div>
      <div className="flex-1 pb-[8.5em]">
        {viewMode === "calendar" ? (
          <div className="p-4">
            <CalendarView
              checklist={localChecklist}
              onItemClick={(item) => setCalendarSelectedItem(item)}
            />
          </div>
        ) : isClient ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div
              className={
                columns.length <= 4
                  ? "h-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-2 sm:p-4"
                  : "h-full lg:flex lg:gap-4 p-2 sm:p-4 overflow-x-auto"
              }
            >
              {columns.map((column) => {
                const items = getItemsByStatus(column.status);
                return (
                  <div
                    key={column.id}
                    className={`${columns.length > 4
                      ? "flex-shrink-0 min-w-[20%]"
                      : "min-w-[24%] "
                      }`}
                  >
                    <KanbanColumn
                      checklist={localChecklist}
                      id={column.id}
                      title={column.title}
                      items={items}
                      status={column.status}
                      checklistId={localChecklist.id}
                      category={localChecklist.category || "Uncategorized"}
                      onUpdate={handleItemUpdate}
                      isShared={isShared}
                      statusColor={
                        statuses.find((s) => s.id === column.id)?.color
                      }
                      statuses={statuses}
                    />
                  </div>
                );
              })}
            </div>

            <DragOverlay>
              {activeItem ? (
                <KanbanCard
                  checklist={localChecklist}
                  item={activeItem}
                  isDragging
                  checklistId={localChecklist.id}
                  category={localChecklist.category || "Uncategorized"}
                  onUpdate={refreshChecklist}
                  isShared={isShared}
                  statuses={statuses}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <div
            className={
              columns.length <= 4
                ? "h-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-2 sm:p-4"
                : "h-full flex gap-4 p-2 sm:p-4 overflow-x-auto"
            }
          >
            {columns.map((column) => {
              const items = getItemsByStatus(column.status);
              return (
                <div
                  key={column.id}
                  className={columns.length > 4 ? "flex-shrink-0" : ""}
                  style={columns.length > 4 ? { width: "320px" } : undefined}
                >
                  <KanbanColumn
                    checklist={localChecklist}
                    id={column.id}
                    title={column.title}
                    items={items}
                    status={column.status}
                    checklistId={localChecklist.id}
                    category={localChecklist.category || "Uncategorized"}
                    onUpdate={handleItemUpdate}
                    isShared={isShared}
                    statusColor={
                      statuses.find((s) => s.id === column.id)?.color
                    }
                    statuses={statuses}
                  />
                </div>
              );
            })}
          </div>
        )}

        <div className="px-4 pt-4 pb-[100px] lg:pb-4">
          {referencingItems.length > 0 &&
            appSettings?.editor?.enableBilateralLinks && (
              <ReferencedBySection referencingItems={referencingItems} />
            )}
        </div>
      </div>

      {calendarSelectedItem && (
        <KanbanCardDetail
          checklist={localChecklist}
          item={calendarSelectedItem}
          isOpen={!!calendarSelectedItem}
          onClose={() => setCalendarSelectedItem(null)}
          onUpdate={handleItemUpdate}
          checklistId={localChecklist.id}
          category={localChecklist.category || "Uncategorized"}
        />
      )}

      {showBulkPasteModal && (
        <BulkPasteModal
          isOpen={showBulkPasteModal}
          onClose={() => setShowBulkPasteModal(false)}
          onSubmit={handleBulkPaste}
          isLoading={isLoading}
        />
      )}

      {showStatusModal && (
        <StatusManager
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          currentStatuses={statuses}
          onSave={handleSaveStatuses}
          itemsByStatus={itemsByStatus}
        />
      )}

      {showArchivedModal && (
        <ArchivedItems
          isOpen={showArchivedModal}
          onClose={() => setShowArchivedModal(false)}
          archivedItems={archivedItems}
          onUnarchive={handleUnarchive}
          statuses={statuses}
        />
      )}
    </div>
  );
};
