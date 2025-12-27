"use client";

import { useState } from "react";
import { Add01Icon, Delete03Icon, DragDropVerticalIcon } from "hugeicons-react";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { KanbanStatus } from "@/app/_types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskStatus } from "@/app/_types/enums";
import { useTranslations } from "next-intl";

const defaultStatusColors: Record<string, string> = {
  [TaskStatus.TODO]: "#6b7280",
  [TaskStatus.IN_PROGRESS]: "#3b82f6",
  [TaskStatus.COMPLETED]: "#10b981",
  [TaskStatus.PAUSED]: "#f59e0b",
};

interface SortableStatusItemProps {
  status: KanbanStatus;
  onUpdateLabel: (id: string, label: string) => void;
  onUpdateColor: (id: string, color: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

const SortableStatusItem = ({
  status,
  onUpdateLabel,
  onUpdateColor,
  onRemove,
  canRemove,
}: SortableStatusItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 border border-border rounded-jotty bg-muted/30"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <DragDropVerticalIcon className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="flex-1">
        <Input
          id={`status-${status.id}`}
          name={`status-${status.id}`}
          type="text"
          value={status.label}
          onChange={(e) => onUpdateLabel(status.id, e.target.value)}
          placeholder="Status name"
          className="!space-y-0 [&>label]:hidden"
        />
      </div>

      <input
        type="color"
        value={status.color || defaultStatusColors[status.id] || "#6b7280"}
        onChange={(e) => onUpdateColor(status.id, e.target.value)}
        className="w-12 h-10 border border-input rounded-jotty cursor-pointer"
        title="Status color"
      />

      <Button
        variant="destructive"
        size="sm"
        onClick={() => onRemove(status.id)}
        disabled={!canRemove}
        className="h-10 w-10 p-0"
      >
        <Delete03Icon className="h-4 w-4" />
      </Button>
    </div>
  );
};

interface StatusManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatuses: KanbanStatus[];
  onSave: (statuses: KanbanStatus[]) => void;
  itemsByStatus?: Record<string, number>;
}

export const StatusManagementModal = ({
  isOpen,
  onClose,
  currentStatuses,
  onSave,
  itemsByStatus = {},
}: StatusManagementModalProps) => {
  const t = useTranslations();
  const [statuses, setStatuses] = useState<KanbanStatus[]>(
    currentStatuses.map((s) => ({
      ...s,
      color: s.color || defaultStatusColors[s.id],
    }))
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleAddStatus = () => {
    const newStatus: KanbanStatus = {
      id: `status_${Date.now()}`,
      label: `New Status`,
      order: statuses.length,
    };
    setStatuses([...statuses, newStatus]);
  };

  const handleUpdateLabel = (id: string, label: string) => {
    setStatuses(statuses.map((s) => (s.id === id ? { ...s, label } : s)));
  };

  const handleUpdateColor = (id: string, color: string) => {
    setStatuses(
      statuses.map((s) =>
        s.id === id ? { ...s, color: color || undefined } : s
      )
    );
  };

  const handleRemoveStatus = (id: string) => {
    const itemCount = itemsByStatus[id] || 0;

    const remainingStatuses = statuses.filter((s) => s.id !== id);
    const sortedRemainingStatuses = [...remainingStatuses].sort((a, b) => a.order - b.order);
    const targetStatus = sortedRemainingStatuses[0];

    if (itemCount > 0) {
      const confirmed = confirm(
        `This status has ${itemCount} item${itemCount > 1 ? "s" : ""}. ` +
        `${itemCount > 1 ? "They" : "It"} will be moved to "${targetStatus?.label || "the first remaining status"
        }". Continue?`
      );
      if (!confirmed) return;
    }

    setStatuses(remainingStatuses.map((s, index) => ({ ...s, order: index })));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = statuses.findIndex((s) => s.id === active.id);
      const newIndex = statuses.findIndex((s) => s.id === over.id);

      const newStatuses = arrayMove(statuses, oldIndex, newIndex);
      setStatuses(newStatuses.map((s, i) => ({ ...s, order: i })));
    }
  };

  const handleSave = () => {
    onSave(statuses);
    onClose();
  };

  const handleClose = () => {
    setStatuses(currentStatuses);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('tasks.manageStatuses')}
      className="lg:max-w-2xl"
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t('tasks.customizeStatuses')}
        </p>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={statuses.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {statuses.map((status) => (
                <SortableStatusItem
                  key={status.id}
                  status={status}
                  onUpdateLabel={handleUpdateLabel}
                  onUpdateColor={handleUpdateColor}
                  onRemove={handleRemoveStatus}
                  canRemove={statuses.length > 1}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <Button variant="outline" onClick={handleAddStatus} className="w-full">
          <Add01Icon className="h-4 w-4 mr-2" />
          {t('tasks.addStatus')}
        </Button>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={handleClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSave}>{t('common.saveChanges')}</Button>
        </div>
      </div>
    </Modal>
  );
};
