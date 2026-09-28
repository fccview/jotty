import { z } from "zod";
import { apiNames } from "@/app/_schemas/api/names";
import { ChecklistsTypes, DropPosition, KanbanPriorityLevel } from "@/app/_types/enums";
import { ListView, categoryField, pageFields, required, searchQuery, timestamp, uuidParam } from "./common";
import { apiItemSchema, checklistTypeSchema, itemIndexParam, timeEntrySchema } from "./items";

const TYPE_REFUSAL = "Type must be 'simple' or 'kanban'";
const PRIORITY_REFUSAL = `'priority' must be one of: ${Object.values(KanbanPriorityLevel).join(", ")}`;
const REORDER_REFUSAL = "'activeItemId' and 'overItemId' are required";
const POSITION_REFUSAL = "'position' must be 'before' or 'after'";
const EMPTY_PATCH = "Provide at least one field to update";

const mustBeString = (field: string) =>
  z.string({ error: `'${field}' must be a string` });

const mustBeNumber = (field: string) =>
  z.number({ error: `'${field}' must be a number` });

export const checklistSchema = z
  .object({
    id: z.string().describe("Checklist uuid"),
    title: z.string(),
    category: z.string(),
    type: checklistTypeSchema,
    owner: z.string().optional(),
    isShared: z.boolean().optional().describe("True when another user shared it with you"),
    items: z.array(apiItemSchema).optional(),
    itemCount: z.number().optional().describe("Top-level items, in the summary view"),
    completedCount: z.number().optional().describe("Completed top-level items, in the summary view"),
    createdAt: timestamp.optional(),
    updatedAt: timestamp.optional(),
  })
  .register(apiNames, { id: "Checklist" });

export const checklistListQuery = z.object({
  category: z.string().optional().describe("Only checklists in this folder"),
  type: z
    .string()
    .optional()
    .describe("Only checklists of this type, matched exactly: 'simple', 'kanban' or the legacy 'task'"),
  q: searchQuery.describe("Case-insensitive match on the title or any top-level item text"),
  view: z
    .enum(ListView)
    .default(ListView.FULL)
    .describe("full returns every item, summary returns item counts instead"),
  ...pageFields,
});

export const checklistCreateBody = z.object({
  title: required("Title"),
  category: categoryField,
  type: z
    .enum(ChecklistsTypes, { error: TYPE_REFUSAL })
    .default(ChecklistsTypes.SIMPLE)
    .describe(checklistTypeSchema.description ?? ""),
});

export const checklistUpdateBody = z.object({
  title: z.string().nullish(),
  category: z.string().nullish().describe("Moving needs create on the target folder and delete on the list"),
});

export const itemCreateBody = z.object({
  text: required("Text"),
  status: z.string().optional().describe("Kanban lists only, a status id. Defaults to the board's first status"),
  time: z
    .union([z.number(), z.string(), z.array(timeEntrySchema)])
    .optional()
    .describe("Kanban lists only, 0 or the tracked time entries"),
  parentIndex: z
    .union([z.string(), z.number()])
    .optional()
    .describe("Tree index of the parent item, e.g. 0 or 2.1. Sub-items ignore status and time"),
});

export const itemUpdateBody = z
  .object({
    text: mustBeString("text").optional(),
    description: mustBeString("description").nullish(),
    priority: z.enum(KanbanPriorityLevel, { error: PRIORITY_REFUSAL }).nullish(),
    score: mustBeNumber("score").nullish(),
    startDate: mustBeString("startDate").nullish().describe("ISO date"),
    targetDate: mustBeString("targetDate").nullish().describe("ISO date"),
    estimatedTime: mustBeNumber("estimatedTime").nullish().describe("Estimated hours"),
  })
  .refine(
    (patch) => Object.values(patch).some((value) => value !== undefined),
    EMPTY_PATCH,
  );

export const itemReorderBody = z.object({
  activeItemId: z.string({ error: REORDER_REFUSAL }).min(1, REORDER_REFUSAL).describe("Id of the item being moved"),
  overItemId: z.string({ error: REORDER_REFUSAL }).min(1, REORDER_REFUSAL).describe("Id of the item it is dropped on"),
  position: z
    .enum(DropPosition, { error: POSITION_REFUSAL })
    .default(DropPosition.BEFORE)
    .describe("Side of overItemId to land on, ignored when isDropInto is true"),
  isDropInto: z.boolean().default(false).describe("Make it the last child of overItemId"),
});

export const itemCreatedSchema = z.object({
  success: z.literal(true),
  data: z
    .object({
      id: z.string().optional().describe("Id of the new item"),
      index: z.string().optional().describe("Tree index of the new item, for the item routes"),
    })
    .optional(),
});

export const listParams = uuidParam("listId", "Checklist");

export const listItemParams = listParams.extend({
  itemIndex: z.string().describe(itemIndexParam.description ?? ""),
});
