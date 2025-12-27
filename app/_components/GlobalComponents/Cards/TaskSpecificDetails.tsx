import { TimeQuarterIcon } from "hugeicons-react";
import { Item } from "@/app/_types";
import { formatTime } from "@/app/_utils/checklist-utils";
import { TaskStatus, TaskStatusLabels } from "@/app/_types/enums";
import { useTranslations } from "next-intl";

interface TaskSpecificDetailsProps {
  items: Item[];
}

export const TaskSpecificDetails = ({ items }: TaskSpecificDetailsProps) => {
  const t = useTranslations();
  const statusCounts = items?.reduce(
    (acc, item) => {
      const status = item.status || TaskStatus.TODO;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {
      [TaskStatus.TODO]: 0,
      [TaskStatus.IN_PROGRESS]: 0,
      [TaskStatus.COMPLETED]: 0,
      [TaskStatus.PAUSED]: 0,
    } as Record<string, number>
  );

  const totalTimeSpent = items?.reduce((total, item) => {
    const itemTotal =
      item.timeEntries?.reduce(
        (sum, entry) => sum + (entry.duration || 0),
        0
      ) || 0;
    return total + itemTotal;
  }, 0);

  return (
    <div className="jotty-task-specific-details mb-3">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div
          className={`jotty-task-specific-details-item flex items-center gap-1 ${statusCounts[TaskStatus.TODO] > 0 ? "opacity-100" : "opacity-50"
            }`}
        >
          <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
          <span className="text-muted-foreground">
            {statusCounts[TaskStatus.TODO]} {TaskStatusLabels.TODO}
          </span>
        </div>
        <div
          className={`jotty-task-specific-details-item flex items-center gap-1 ${statusCounts[TaskStatus.IN_PROGRESS] > 0
            ? "opacity-100"
            : "opacity-50"
            }`}
        >
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="text-muted-foreground">
            {statusCounts[TaskStatus.IN_PROGRESS]}{" "}
            {TaskStatusLabels.IN_PROGRESS}
          </span>
        </div>
        <div
          className={`jotty-task-specific-details-item flex items-center gap-1 ${statusCounts[TaskStatus.COMPLETED] > 0
            ? "opacity-100"
            : "opacity-50"
            }`}
        >
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-muted-foreground">
            {statusCounts[TaskStatus.COMPLETED]} {TaskStatusLabels.COMPLETED}
          </span>
        </div>
        {statusCounts.paused > 0 && (
          <div
            className={`jotty-task-specific-details-item flex items-center gap-1 ${statusCounts[TaskStatus.PAUSED] > 0 ? "opacity-100" : "opacity-50"
              }`}
          >
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span className="text-muted-foreground">
              {statusCounts[TaskStatus.PAUSED]} {TaskStatusLabels.PAUSED}
            </span>
          </div>
        )}
      </div>

      {totalTimeSpent > 0 && (
        <div className="jotty-task-total-time mt-2 pt-2 border-t border-border">
          <div className="flex items-center gap-1 text-xs">
            <TimeQuarterIcon className="h-3 w-3 text-purple-500" />
            <span className="text-muted-foreground">{t("tasks.totalTime")} </span>
            <span className="font-medium text-purple-600">
              {formatTime(totalTimeSpent)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
