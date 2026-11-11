import { z } from "zod";
import { apiNames } from "@/app/_schemas/api/names";
import { ChecklistsTypes, KanbanPriorityLevel } from "@/app/_types/enums";
import { timestamp } from "./common";
import { RECURRENCE_REFUSED, isRecurrenceInput } from "@/app/_utils/recurrence-utils";

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
    color: z
      .string()
      .optional()
      .describe("Hex colour as #rrggbb, like #3b82f6. Left out, the column gets a default grey or its built-in colour"),
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

export const recurrenceSchema = z
  .object({
    rrule: z.string().describe("RFC 5545 RRULE without the RRULE: prefix, like FREQ=WEEKLY;INTERVAL=1"),
    dtstart: timestamp.describe("When the series starts"),
    until: timestamp.optional().describe("When the series stops"),
    nextDue: timestamp.optional().describe("Next occurrence, worked out by the server"),
    lastCompleted: timestamp.optional().describe("When the item was last rolled to its next occurrence"),
  })
  .register(apiNames, { id: "Recurrence" });

export const recurrenceBody = z
  .object({
    rrule: z.string().describe(recurrenceSchema.shape.rrule.description ?? ""),
    dtstart: z.string().describe("When the series starts. Any date Date.parse accepts, ISO 8601 recommended"),
    until: z.string().optional().describe("When the series stops, left out for no end"),
  })
  .refine(isRecurrenceInput, RECURRENCE_REFUSED)
  .describe("Repeats the item. The server works out nextDue. Completing it rolls it to the next occurrence once that is due")
  .register(apiNames, { id: "RecurrenceInput" });

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
  reminder?: z.infer<typeof reminderSchema>;
  recurrence?: z.infer<typeof recurrenceSchema>;
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
    reminder: reminderSchema.optional(),
    recurrence: recurrenceSchema.optional(),
    get children() {
      return z.array(apiItemSchema).optional();
    },
  })
  .register(apiNames, { id: "ChecklistItem" });

export const itemIndexParam = z
  .string()
  .regex(/^\d+(\.\d+)*$/, "Invalid item index")
  .describe("Tree index inside the list, children joined with '.', e.g. 0 or 2.1");
