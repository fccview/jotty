import { CheckCircle, Clock, Timer } from "lucide-react";
import { Checklist } from "@/app/_types";
import { formatRelativeTime } from "@/app/_utils/date-utils";
import { isItemCompleted, formatTime } from "@/app/_utils/checklist-utils";
import { TaskSpecificDetails } from "@/app/_components/GlobalComponents/Cards/TaskSpecificDetails";

interface ChecklistCardProps {
  list: Checklist;
  onSelect: (list: Checklist) => void;
}

export const ChecklistCard = ({ list, onSelect }: ChecklistCardProps) => {
  const totalItems = list.items.length;
  const completedItems = list.items.filter((item) =>
    isItemCompleted(item, list.type)
  ).length;
  const completionRate =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div
      onClick={() => onSelect(list)}
      className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:shadow-md hover:border-primary/50 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors flex-1 truncate pr-2">
          {list.title}
        </h3>
        {list.category && (
          <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full flex-shrink-0">
            {list.category.split("/").pop()}
          </span>
        )}
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
