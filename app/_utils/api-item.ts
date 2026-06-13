import { Item, KanbanPriority, StatusChange, TimeEntry } from "@/app/_types";
import { TaskStatus } from "@/app/_types/enums";

export interface ApiItem {
  id: string;
  index: number;
  text: string;
  completed: boolean;
  status?: string;
  time?: number | TimeEntry[];
  description?: string;
  priority?: KanbanPriority;
  score?: number;
  startDate?: string;
  targetDate?: string;
  estimatedTime?: number;
  createdBy?: string;
  createdAt?: string;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
  history?: StatusChange[];
  children?: ApiItem[];
}

export const toApiItem = (
  item: Item,
  index: number,
  isKanban: boolean,
): ApiItem => {
  const apiItem: ApiItem = {
    id: item.id,
    index,
    text: item.text,
    completed: item.completed,
  };

  if (isKanban) {
    apiItem.status = item.status || TaskStatus.TODO;
    apiItem.time =
      item.timeEntries && item.timeEntries.length > 0 ? item.timeEntries : 0;
  }

  if (item.description !== undefined) apiItem.description = item.description;
  if (item.priority !== undefined) apiItem.priority = item.priority;
  if (item.score !== undefined) apiItem.score = item.score;
  if (item.startDate !== undefined) apiItem.startDate = item.startDate;
  if (item.targetDate !== undefined) apiItem.targetDate = item.targetDate;
  if (item.estimatedTime !== undefined)
    apiItem.estimatedTime = item.estimatedTime;
  if (item.createdBy !== undefined) apiItem.createdBy = item.createdBy;
  if (item.createdAt !== undefined) apiItem.createdAt = item.createdAt;
  if (item.lastModifiedBy !== undefined)
    apiItem.lastModifiedBy = item.lastModifiedBy;
  if (item.lastModifiedAt !== undefined)
    apiItem.lastModifiedAt = item.lastModifiedAt;
  if (item.history !== undefined) apiItem.history = item.history;

  if (item.children && item.children.length > 0) {
    apiItem.children = item.children.map((child, childIndex) =>
      toApiItem(child, childIndex, isKanban),
    );
  }

  return apiItem;
};
