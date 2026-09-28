import { z } from "zod";
import { apiNames } from "@/app/_schemas/api/names";
import { categoryField, required, searchQuery, timestamp, uuidParam } from "./common";
import { apiItemSchema, itemIndexParam, kanbanStatusSchema } from "./items";

const STATUS_FIELDS_REQUIRED = "Status id and label are required";
const STATUS_IDS_UNIQUE = "Status ids must be unique";

const statusField = z
  .string({ error: STATUS_FIELDS_REQUIRED })
  .min(1, STATUS_FIELDS_REQUIRED);

export const taskStatusSchema = kanbanStatusSchema
  .extend({
    name: z
      .string()
      .optional()
      .describe("Deprecated copy of label, only sent while a task still uses the default columns"),
  })
  .register(apiNames, { id: "TaskStatus" });

export const taskSchema = z
  .object({
    id: z.string().describe("Task uuid"),
    title: z.string(),
    category: z.string(),
    statuses: z.array(taskStatusSchema),
    items: z.array(apiItemSchema).optional().describe("Left out of update responses"),
    createdAt: timestamp.optional(),
    updatedAt: timestamp.optional(),
  })
  .register(apiNames, { id: "Task" });

export const taskListQuery = z.object({
  category: z.string().optional().describe("Only tasks in this folder"),
  status: z.string().optional().describe("Only tasks with at least one top-level item in this status id"),
  q: searchQuery,
});

const newColumn = z
  .object({
    id: required("Status id"),
    label: z.string().optional(),
    name: z.string().optional().describe("Deprecated alias for label"),
    color: z.string().optional(),
    order: z.number().optional().describe("Defaults to the column's position in the array"),
    autoComplete: z.boolean().optional().describe("Items moved here are marked completed"),
  })
  .refine((column) => Boolean(column.label || column.name), {
    error: "Status label is required",
  });

export const taskCreateBody = z.object({
  title: required("Title"),
  category: categoryField,
  statuses: z
    .array(newColumn)
    .refine((columns) => new Set(columns.map((column) => column.id)).size === columns.length, {
      error: STATUS_IDS_UNIQUE,
    })
    .optional()
    .describe("Your own Kanban columns, defaults to todo, in_progress and completed"),
});

export const taskUpdateBody = z.object({
  title: z.string().optional(),
  category: z.string().optional(),
});

export const taskParams = uuidParam("taskId", "Task");

export const taskItemParams = taskParams.extend({ itemIndex: itemIndexParam });

export const taskStatusParams = taskParams.extend({
  statusId: z.string().describe("Status id"),
});

export const statusCreateBody = z.object({
  id: statusField.describe("Status id, unique within the task"),
  label: statusField.describe("Column name shown on the board"),
  color: z.string().optional(),
  order: z.number().optional().describe("Defaults to last"),
  autoComplete: z.boolean().optional().describe("Items moved here are marked completed, defaults to false"),
});

export const statusUpdateBody = z.object({
  label: z.string().optional(),
  color: z.string().nullable().optional().describe("null clears the color"),
  order: z.number().optional(),
  autoComplete: z.boolean().optional().describe("Items moved here are marked completed"),
});

export const taskItemCreateBody = z.object({
  text: required("Text"),
  status: z.string().optional().describe("Starting status id, defaults to todo"),
  parentIndex: z
    .union([z.number().int().nonnegative(), itemIndexParam])
    .optional()
    .describe("Tree index of the parent item, e.g. 0 or 2.1"),
});

export const itemStatusBody = z.object({
  status: required("Status").describe("Status id to move the item to"),
});
