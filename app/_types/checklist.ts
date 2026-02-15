import { ItemTypes } from "./enums";

export type ChecklistType = "simple" | "task";

export interface TimeEntry {
  id: string;
  startTime: string;
  endTime?: string;
  duration?: number;
}

export interface RecurrenceRule {
  rrule: string;
  dtstart: string;
  until?: string;
  nextDue?: string;
  lastCompleted?: string;
}

export interface StatusChange {
  status: string;
  timestamp: string;
  user: string;
}

export interface KanbanStatus {
  id: string;
  label: string;
  color?: string;
  order: number;
  autoComplete?: boolean;
}

export interface Item {
  id: string;
  category?: string;
  text: string;
  completed: boolean;
  order: number;
  status?: string;
  timeEntries?: TimeEntry[];
  estimatedTime?: number;
  targetDate?: string;
  children?: Item[];
  createdBy?: string;
  createdAt?: string;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
  history?: StatusChange[];
  description?: string;
  recurrence?: RecurrenceRule;
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  previousStatus?: string;
}

export interface List {
  id: string;
  title: string;
  category?: string;
  items: Item[];
}

export interface Checklist {
  id: string;
  uuid?: string;
  title: string;
  type: ChecklistType;
  category?: string;
  items: Item[];
  createdAt: string;
  updatedAt: string;
  owner?: string;
  isShared?: boolean;
  itemType?: ItemTypes;
  isDeleted?: boolean;
  rawContent?: string;
  statuses?: KanbanStatus[];
}
