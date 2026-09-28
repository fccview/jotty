import { z } from "zod";
import { apiNames } from "@/app/_schemas/api/names";
import { ChecklistsTypes, KanbanPriorityLevel } from "@/app/_types/enums";
import { timestamp } from "./common";

export const checklistTypeSchema = z
  .enum(ChecklistsTypes)
  .describe("'task' is the legacy name for 'kanban' and is still accepted");

export const prioritySchema = z.enum(KanbanPriorityLevel);

export const timeEntrySchema = z
  .object({
    id: z.string(),
    startTime: timestamp,
    endTime: timestamp.optional(),
    duration: z.number().optional(),
    user: z.string().optional(),
  })
  .register(apiNames, { id: "TimeEntry" });

export const statusChangeSchema = z
  .object({
    status: z.string(),
    timestamp,
    user: z.string(),
  })
  .register(apiNames, { id: "StatusChange" });

export const kanbanStatusSchema = z
  .object({
    id: z.string().describe("Status id, used as an item's status value"),
    label: z.string(),
    color: z.string().optional(),
    order: z.number(),
    autoComplete: z.boolean().optional().describe("Items moved here are marked completed"),
  })
  .register(apiNames, { id: "KanbanStatus" });

export const reminderSchema = z
  .object({
    datetime: timestamp,
    notified: z.boolean().optional(),
  })
  .register(apiNames, { id: "KanbanReminder" });

type ApiItemShape = {
  id: string;
  index: number;
  itemIndex: string;
  text: string;
  completed: boolean;
  status?: string;
  time?: number | z.infer<typeof timeEntrySchema>[];
  description?: string;
  priority?: KanbanPriorityLevel;
  score?: number;
  startDate?: string;
  targetDate?: string;
  estimatedTime?: number;
  createdBy?: string;
  createdAt?: string;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
  history?: z.infer<typeof statusChangeSchema>[];
  children?: ApiItemShape[];
};

export const apiItemSchema: z.ZodType<ApiItemShape> = z
  .object({
    id: z.string().describe("Item id inside its list"),
    index: z.number().describe("Position among its siblings"),
    itemIndex: z.string().describe("Tree index to pass as {itemIndex}, e.g. 0 or 2.1"),
    text: z.string(),
    completed: z.boolean(),
    status: z.string().optional().describe("Kanban lists only, a status id"),
    time: z
      .union([z.number(), z.array(timeEntrySchema)])
      .optional()
      .describe("Kanban lists only, 0 or the tracked time entries"),
    description: z.string().optional(),
    priority: prioritySchema.optional(),
    score: z.number().optional(),
    startDate: z.string().optional(),
    targetDate: z.string().optional(),
    estimatedTime: z.number().optional(),
    createdBy: z.string().optional(),
    createdAt: timestamp.optional(),
    lastModifiedBy: z.string().optional(),
    lastModifiedAt: timestamp.optional(),
    history: z.array(statusChangeSchema).optional(),
    get children() {
      return z.array(apiItemSchema).optional();
    },
  })
  .register(apiNames, { id: "ChecklistItem" });

export const itemIndexParam = z
  .string()
  .regex(/^\d+(\.\d+)*$/, "Invalid item index")
  .describe("Tree index inside the list, children joined with '.', e.g. 0 or 2.1");
