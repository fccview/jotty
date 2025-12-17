import { Clock01Icon, TimeQuarterIcon } from "hugeicons-react";
import { TaskStatus } from "@/app/_types/enums";

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

export const getStatusColor = (status?: string): string => {
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
