"use client";

import { useState, useEffect, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Checklist, KanbanStatus } from "@/app/_types";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanItem } from "./KanbanItem";
import { ChecklistHeading } from "../Common/ChecklistHeading";
import { BulkPasteModal } from "@/app/_components/GlobalComponents/Modals/BulkPasteModal/BulkPasteModal";
import { StatusManagementModal } from "./StatusManagementModal";
import { ArchivedItemsModal } from "./ArchivedItemsModal";
import { useKanbanBoard } from "../../../../../_hooks/useKanbanBoard";
import { ItemTypes, TaskStatus, TaskStatusLabels } from "@/app/_types/enums";
import { ReferencedBySection } from "../../../Notes/Parts/ReferencedBySection";
import { getReferences } from "@/app/_utils/indexes-utils";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { encodeCategoryPath } from "@/app/_utils/global-utils";
import { usePermissions } from "@/app/_providers/PermissionsProvider";
import { Settings01Icon, Archive02Icon } from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { updateChecklistStatuses } from "@/app/_server/actions/checklist";
import { unarchiveItem } from "@/app/_server/actions/checklist-item";
import { useTranslations } from "next-intl";

interface KanbanBoardProps {
  checklist: Checklist;
  onUpdate: (updatedChecklist: Checklist) => void;
}

const defaultStatuses: KanbanStatus[] = [
  {
    id: TaskStatus.TODO,
    label: TaskStatusLabels.TODO,
    order: 0,
  },
  {
    id: TaskStatus.IN_PROGRESS,
    label: TaskStatusLabels.IN_PROGRESS,
    order: 1,
  },
  {
    id: TaskStatus.COMPLETED,
    label: TaskStatusLabels.COMPLETED,
    order: 2,
  },
  {
    id: TaskStatus.PAUSED,
    label: TaskStatusLabels.PAUSED,
    order: 3,
  },
];

export const KanbanBoard = ({ checklist, onUpdate }: KanbanBoardProps) => {
  const t = useTranslations();
  const [isClient, setIsClient] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showArchivedModal, setShowArchivedModal] = useState(false);
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
    getItemsByStatus,
    handleDragStart,
    handleDragEnd,
    handleAddItem,
    handleBulkPaste,
    handleItemStatusUpdate,
    activeItem,
  } = useKanbanBoard({ checklist, onUpdate });

  const statuses = localChecklist.statuses || defaultStatuses;

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
          placeholder={t('checklists.addNewTask')}
          submitButtonText={t('tasks.addTask')}
        />
      )}
      <div className="flex gap-2 px-4 pt-4 pb-2 w-full justify-end">
        {permissions?.canEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStatusModal(true)}
            className="text-md lg:text-sm lg:text-xs"
          >
            <Settings01Icon className="h-3 w-3 mr-1" />
            {t('tasks.manageStatuses')}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowArchivedModal(true)}
          className="text-md lg:text-sm lg:text-xs"
        >
          <Archive02Icon className="h-3 w-3 mr-1" />
          {t('tasks.viewArchived')}
        </Button>
      </div>
      <div className="flex-1 pb-[8.5em]">
        {isClient ? (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
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
                      onUpdate={refreshChecklist}
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
                <KanbanItem
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
                    onUpdate={refreshChecklist}
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

      {showBulkPasteModal && (
        <BulkPasteModal
          isOpen={showBulkPasteModal}
          onClose={() => setShowBulkPasteModal(false)}
          onSubmit={handleBulkPaste}
          isLoading={isLoading}
        />
      )}

      {showStatusModal && (
        <StatusManagementModal
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          currentStatuses={statuses}
          onSave={handleSaveStatuses}
          itemsByStatus={itemsByStatus}
        />
      )}

      {showArchivedModal && (
        <ArchivedItemsModal
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
