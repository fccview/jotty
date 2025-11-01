import { CheckCircle, Clock, Timer, Pin, PinOff } from "lucide-react";
import { Checklist } from "@/app/_types";
import { formatRelativeTime } from "@/app/_utils/date-utils";
import { isItemCompleted, formatTime } from "@/app/_utils/checklist-utils";
import { TaskSpecificDetails } from "@/app/_components/GlobalComponents/Cards/TaskSpecificDetails";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ChecklistCardProps {
  list: Checklist;
  onSelect: (list: Checklist) => void;
  isPinned?: boolean;
  onTogglePin?: (list: Checklist) => void;
  isDraggable?: boolean;
}

export const ChecklistCard = ({
  list,
  onSelect,
  isPinned = false,
  onTogglePin,
  isDraggable = false,
}: ChecklistCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list.id,
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const totalItems = list.items.length;
  const completedItems = list.items.filter((item) =>
    isItemCompleted(item, list.type)
  ).length;
  const completionRate =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isDraggable ? { ...attributes, ...listeners } : {})}
      onClick={() => onSelect(list)}
      className={`jotty-checklist-card bg-card border border-border rounded-lg p-4 cursor-pointer hover:shadow-md hover:border-primary/50 transition-all duration-200 group ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h3 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
            {list.title}
          </h3>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onTogglePin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(list);
              }}
              className={`${
                isPinned ? "opacity-100" : "opacity-0"
              } group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded`}
              title={isPinned ? "Unpin" : "Pin"}
            >
              {isPinned ? (
                <PinOff className="h-3 w-3 text-muted-foreground hover:text-primary" />
              ) : (
                <Pin className="h-3 w-3 text-muted-foreground hover:text-primary" />
              )}
            </button>
          )}
          {list.category && (
            <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
              {list.category.split("/").pop()}
            </span>
          )}
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Progress</span>
          <span>{completionRate}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary rounded-full h-2 transition-all duration-300"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      {list.type === "task" && <TaskSpecificDetails items={list.items} />}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          <span>
            {completedItems}/{totalItems} completed
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{formatRelativeTime(list.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
};
