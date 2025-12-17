import {
  CheckmarkSquare04Icon,
  PauseIcon,
  TaskDaily01Icon,
} from "hugeicons-react";
import { Modes, TaskStatus, TaskStatusLabels } from "../_types/enums";

export const CHECKLISTS_FOLDER = Modes.CHECKLISTS;

export const TASK_STATUS_CONFIG = {
  [TaskStatus.TODO]: {
    title: TaskStatusLabels.TODO,
    Icon: CheckmarkSquare04Icon,
    iconClassName: "text-muted-foreground",
  },
  [TaskStatus.IN_PROGRESS]: {
    title: TaskStatusLabels.IN_PROGRESS,
    Icon: TaskDaily01Icon,
    iconClassName: "text-blue-600",
  },
  [TaskStatus.PAUSED]: {
    title: TaskStatusLabels.PAUSED,
    Icon: PauseIcon,
    iconClassName: "text-yellow-600",
  },
  [TaskStatus.COMPLETED]: {
    title: TaskStatusLabels.COMPLETED,
    Icon: CheckmarkSquare04Icon,
    iconClassName: "text-green-600",
  },
};
