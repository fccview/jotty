import { KanbanStatus } from "@/app/_types";
import { TaskStatus, TaskStatusLabels } from "@/app/_types/enums";

export const DEFAULT_KANBAN_STATUSES: KanbanStatus[] = [
  {
    id: TaskStatus.TODO,
    label: TaskStatusLabels.TODO,
    order: 0,
    autoComplete: false,
  },
  {
    id: TaskStatus.IN_PROGRESS,
    label: TaskStatusLabels.IN_PROGRESS,
    order: 1,
    autoComplete: false,
  },
  {
    id: TaskStatus.COMPLETED,
    label: TaskStatusLabels.COMPLETED,
    order: 2,
    autoComplete: true,
  },
  {
    id: TaskStatus.PAUSED,
    label: TaskStatusLabels.PAUSED,
    order: 3,
    autoComplete: false,
  },
];

export const FALLBACK_STATUS_COLOR = "#6b7280";

export const DEFAULT_STATUS_COLORS: Record<string, string> = {
  [TaskStatus.TODO]: FALLBACK_STATUS_COLOR,
  [TaskStatus.IN_PROGRESS]: "#3b82f6",
  [TaskStatus.COMPLETED]: "#10b981",
  [TaskStatus.PAUSED]: "#f59e0b",
};

export const statusColor = (status?: Pick<KanbanStatus, "id" | "color">): string =>
  status?.color || DEFAULT_STATUS_COLORS[status?.id || ""] || FALLBACK_STATUS_COLOR;

export const UNKNOWN_STATUS = "Status not found on this board";

export const boardColumns = (statuses?: KanbanStatus[]): KanbanStatus[] =>
  statuses?.length ? statuses : DEFAULT_KANBAN_STATUSES;

export const unknownStatus = (statuses?: KanbanStatus[]): string =>
  `${UNKNOWN_STATUS}. Its columns are ${boardColumns(statuses).map((column) => column.id).join(", ")}`;

export const TAKEN_EXTERNAL_ID = "Another card on this board already has that externalId";

export const MAX_CARD_BATCH = 200;

export const MAX_EXTERNAL_ID = 512;

export const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export const STATUS_COLOR_REFUSED = "Status color must be a hex colour written #rrggbb, like #3b82f6";

export const strayColor = (next: KanbanStatus[], stored: KanbanStatus[] = []): boolean => {
  const kept = new Map(stored.map((status) => [status.id, status.color]));
  return next.some(({ id, color }) => !!color && !HEX_COLOR.test(color) && kept.get(id) !== color);
};

export const isUnknownStatus = (error?: string): boolean => !!error?.startsWith(UNKNOWN_STATUS);

export const PROPERTY_FIELD_CLASS =
  "w-full px-3 py-2 text-md lg:text-sm bg-background border border-input rounded-jotty focus:outline-none focus:border-ring transition-colors";
