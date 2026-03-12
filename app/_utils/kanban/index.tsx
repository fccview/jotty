import { Clock01Icon, TimeQuarterIcon } from "hugeicons-react";
import { TaskStatus } from "@/app/_types/enums";
import { Item, KanbanPriority } from "@/app/_types";

import type { JSX } from "react";

export const formatTimerTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
};

export const getStatusColor = (status?: string, customColor?: string): string => {
  if (customColor) {
    return `bg-[${customColor}]/10 border-[${customColor}]/30`;
  }

  switch (status) {
    case TaskStatus.TODO:
      return "bg-background/50 border-border";
    case TaskStatus.IN_PROGRESS:
      return "bg-primary/10 border-primary/30";
    case TaskStatus.COMPLETED:
      return "bg-green-500/10 border-green-500/30";
    case TaskStatus.PAUSED:
      return "bg-yellow-500/10 border-yellow-500/30";
    default:
      return "bg-muted/50 border-border";
  }
};

export const getStatusIcon = (status?: string): JSX.Element | null => {
  switch (status) {
    case TaskStatus.IN_PROGRESS:
      return <TimeQuarterIcon className="h-3 w-3 text-primary" />;
    case TaskStatus.COMPLETED:
      return (
        <Clock01Icon className="h-3 w-3 text-green-600 dark:text-green-400" />
      );
    case TaskStatus.PAUSED:
      return (
        <Clock01Icon className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
      );
    default:
      return null;
  }
};

const PRIORITY_CONFIG: Record<KanbanPriority, { dotColor: string; translationKey: string; sortOrder: number }> = {
  critical: { dotColor: "#ef4444", translationKey: "kanban.critical", sortOrder: 0 },
  high: { dotColor: "#f97316", translationKey: "kanban.high", sortOrder: 1 },
  medium: { dotColor: "#eab308", translationKey: "kanban.medium", sortOrder: 2 },
  low: { dotColor: "#3b82f6", translationKey: "kanban.low", sortOrder: 3 },
  none: { dotColor: "transparent", translationKey: "kanban.none", sortOrder: 4 },
};

export const getPriorityDotColor = (priority?: KanbanPriority): string =>
  PRIORITY_CONFIG[priority || "none"].dotColor;

export const getPriorityLabel = (priority: KanbanPriority | undefined, t: (key: string) => string): string =>
  t(PRIORITY_CONFIG[priority || "none"].translationKey);

export const _getPrioritySortOrder = (priority?: KanbanPriority): number =>
  PRIORITY_CONFIG[priority || "none"].sortOrder;

export const sortByPriority = (items: Item[]): Item[] =>
  [...items].sort((a, b) =>
    _getPrioritySortOrder(a.priority) - _getPrioritySortOrder(b.priority)
  );

export const calculatePriorityScore = (item: Item): number => {
  const priorityWeight = 5 - _getPrioritySortOrder(item.priority);
  const scoreWeight = item.score ?? 0;
  return priorityWeight * 10 + scoreWeight;
};
