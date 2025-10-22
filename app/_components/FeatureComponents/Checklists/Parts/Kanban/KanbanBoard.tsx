"use client";

import { useState, useEffect } from "react";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { Checklist } from "@/app/_types";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanItem } from "./KanbanItem";
import { ChecklistHeading } from "../Common/ChecklistHeading";
import { BulkPasteModal } from "@/app/_components/GlobalComponents/Modals/BulkPasteModal/BulkPasteModal";
import { useKanbanBoard } from "../../../../../_hooks/useKanbanBoard";
import { TaskStatus, TaskStatusLabels } from "@/app/_types/enums";

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

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="h-full flex flex-col bg-background">
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

      <div className="flex-1 overflow-hidden pb-[8.5em]">
        {isClient ? (
          <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="h-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-2 sm:p-4 overflow-x-auto">
              {columns.map((column) => {
                const items = getItemsByStatus(column.status);
                return (
                  <KanbanColumn
                    key={column.id}
                    id={column.id}
                    title={column.title}
                    items={items}
                    status={column.status}
                    checklistId={localChecklist.id}
                    category={localChecklist.category || "Uncategorized"}
                    onUpdate={refreshChecklist}
                  />
                );
              })}
            </div>

            <DragOverlay>
              {activeItem ? (
                <KanbanItem
                  item={activeItem}
                  isDragging
                  checklistId={localChecklist.id}
                  category={localChecklist.category || "Uncategorized"}
                  onUpdate={refreshChecklist}
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
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  items={items}
                  status={column.status}
                  checklistId={localChecklist.id}
                  category={localChecklist.category || "Uncategorized"}
                  onUpdate={refreshChecklist}
                />
              );
            })}
          </div>
        )}
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
