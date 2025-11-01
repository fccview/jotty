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
import { Checklist } from "@/app/_types";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanItem } from "./KanbanItem";
import { ChecklistHeading } from "../Common/ChecklistHeading";
import { BulkPasteModal } from "@/app/_components/GlobalComponents/Modals/BulkPasteModal/BulkPasteModal";
import { useKanbanBoard } from "../../../../../_hooks/useKanbanBoard";
import { TaskStatus, TaskStatusLabels } from "@/app/_types/enums";
import { ReferencedBySection } from "../../../Notes/Parts/ReferencedBySection";
import { getReferences } from "@/app/_utils/indexes-utils";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { encodeCategoryPath } from "@/app/_utils/global-utils";

interface KanbanBoardProps {
  checklist: Checklist;
  onUpdate: (updatedChecklist: Checklist) => void;
}

const columns = [
  {
    id: TaskStatus.TODO,
    title: TaskStatusLabels.TODO,
    status: TaskStatus.TODO as const,
  },
  {
    id: TaskStatus.IN_PROGRESS,
    title: TaskStatusLabels.IN_PROGRESS,
    status: TaskStatus.IN_PROGRESS as const,
  },
  {
    id: TaskStatus.COMPLETED,
    title: TaskStatusLabels.COMPLETED,
    status: TaskStatus.COMPLETED as const,
  },
  {
    id: TaskStatus.PAUSED,
    title: TaskStatusLabels.PAUSED,
    status: TaskStatus.PAUSED as const,
  },
];

export const KanbanBoard = ({ checklist, onUpdate }: KanbanBoardProps) => {
  const [isClient, setIsClient] = useState(false);
  const { linkIndex, notes, checklists, appSettings } = useAppMode();
  const { allSharedItems } = useAppMode();
  const encodedCategory = encodeCategoryPath(checklist.category || "Uncategorized");
  const isShared = allSharedItems?.checklists.some(
    (sharedChecklist) => sharedChecklist.id === checklist.id && sharedChecklist.category === encodedCategory
  ) || false;
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
    activeItem,
  } = useKanbanBoard({ checklist, onUpdate });



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
      checklist.id,
      checklist.category,
      "checklist",
      notes,
      checklists
    );
  }, [linkIndex, checklist.id, checklist.category, checklists, notes]);

  return (
    <div className="h-full flex flex-col bg-background overflow-y-auto">
      <ChecklistHeading
        checklist={localChecklist}
        key={focusKey}
        onSubmit={handleAddItem}
        onBulkSubmit={() => setShowBulkPasteModal(true)}
        isLoading={isLoading}
        autoFocus={true}
        focusKey={focusKey}
        placeholder="Add new task..."
        submitButtonText="Add Task"
      />

      <div className="flex-1 pb-[8.5em]">
        {isClient ? (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="h-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-2 sm:p-4 overflow-x-auto">
              {columns.map((column) => {
                const items = getItemsByStatus(column.status);
                return (
                  <KanbanColumn
                    checklist={localChecklist}
                    key={column.id}
                    id={column.id}
                    title={column.title}
                    items={items}
                    status={column.status}
                    checklistId={localChecklist.id}
                    category={localChecklist.category || "Uncategorized"}
                    onUpdate={refreshChecklist}
                    isShared={isShared}
                  />
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
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <div className="h-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-2 sm:p-4 overflow-x-auto">
            {columns.map((column) => {
              const items = getItemsByStatus(column.status);
              return (
                <KanbanColumn
                  checklist={localChecklist}
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  items={items}
                  status={column.status}
                  checklistId={localChecklist.id}
                  category={localChecklist.category || "Uncategorized"}
                  onUpdate={refreshChecklist}
                  isShared={isShared}
                />
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
    </div>
  );
};
