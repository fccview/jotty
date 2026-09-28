import { z } from "zod";
import { apiNames } from "@/app/_schemas/api/names";
import { KanbanPriorityLevel } from "@/app/_types/enums";
import {
  ListView,
  categoryField,
  envelope,
  errorSchema,
  pageFields,
  required,
  searchQuery,
  timestamp,
  uuidParam,
} from "./common";
import {
  checklistTypeSchema,
  kanbanStatusSchema,
  prioritySchema,
  reminderSchema,
  statusChangeSchema,
  timeEntrySchema,
} from "./items";

type CardShape = {
  id: string;
  index: number;
  text: string;
  status: string;
  completed: boolean;
  priority?: KanbanPriorityLevel;
  score?: number;
  assignee?: string;
  reminder?: z.infer<typeof reminderSchema>;
  children?: CardShape[];
};

export const kanbanCardSchema: z.ZodType<CardShape> = z
  .object({
    id: z.string().describe("Card id inside the board, use it as {itemId}"),
    index: z.number().describe("Position among its siblings"),
    text: z.string(),
    status: z.string().describe("Status id, 'todo' when the card has none"),
    completed: z.boolean(),
    priority: prioritySchema.optional(),
    score: z.number().optional(),
    assignee: z.string().optional().describe("Username"),
    reminder: reminderSchema.optional(),
    get children() {
      return z.array(kanbanCardSchema).optional();
    },
  })
  .register(apiNames, { id: "KanbanCard" });

export const boardSchema = z
  .object({
    id: z.string().describe("Board uuid"),
    title: z.string(),
    category: z.string(),
    statuses: z
      .array(kanbanStatusSchema)
      .describe("The board's columns, or the default columns when the board never changed them"),
    items: z.array(kanbanCardSchema).optional().describe("Left out in the summary view"),
    itemCount: z.number().optional().describe("Top-level cards, in the summary view"),
    statusCounts: z
      .record(z.string(), z.number())
      .optional()
      .describe("Top-level cards per status id, in the summary view"),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .register(apiNames, { id: "KanbanBoard" });

type StoredCardShape = {
  id: string;
  text: string;
  completed: boolean;
  order: number;
  status?: string;
  description?: string;
  priority?: KanbanPriorityLevel;
  score?: number;
  assignee?: string;
  reminder?: z.infer<typeof reminderSchema>;
  timeEntries?: z.infer<typeof timeEntrySchema>[];
  history?: z.infer<typeof statusChangeSchema>[];
  createdBy?: string;
  createdAt?: string;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
  children?: StoredCardShape[];
};

export const storedCardSchema: z.ZodType<StoredCardShape> = z
  .looseObject({
    id: z.string().describe("Card id inside the board, use it as {itemId}"),
    text: z.string(),
    completed: z.boolean(),
    order: z.number(),
    status: z.string().optional(),
    description: z.string().optional(),
    priority: prioritySchema.optional(),
    score: z.number().optional(),
    assignee: z.string().optional(),
    reminder: reminderSchema.optional(),
    timeEntries: z.array(timeEntrySchema).optional(),
    history: z.array(statusChangeSchema).optional(),
    createdBy: z.string().optional(),
    createdAt: timestamp.optional(),
    lastModifiedBy: z.string().optional(),
    lastModifiedAt: timestamp.optional(),
    get children() {
      return z.array(storedCardSchema).optional();
    },
  })
  .describe("A card as stored in the board file. Other stored fields may appear.")
  .register(apiNames, { id: "KanbanStoredCard" });

export const storedBoardSchema = z
  .looseObject({
    id: z.string().describe("On-disk filename, changes on rename. Use uuid instead"),
    uuid: z.string().describe("Board uuid"),
    title: z.string(),
    type: checklistTypeSchema,
    category: z.string().optional(),
    owner: z.string().optional(),
    statuses: z.array(kanbanStatusSchema).optional(),
    items: z.array(storedCardSchema),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .describe("The whole board as stored after the change, unlike the trimmed KanbanBoard. Other stored fields may appear.")
  .register(apiNames, { id: "KanbanStoredBoard" });

export const cardChangedSchema = envelope(storedBoardSchema).extend({
  item: storedCardSchema.optional().describe("The changed card on its own, so you don't have to find it in the board"),
});

export const calendarEventSchema = z
  .object({
    id: z.string().describe("Card id"),
    itemId: z.string().describe("Card id, same as id"),
    title: z.string().describe("Card text"),
    startDate: z.string().describe("YYYY-MM-DD, the card's start date or its target date"),
    endDate: z.string().describe("YYYY-MM-DD, the card's target date"),
    status: z.string().optional(),
    priority: prioritySchema.optional(),
    completed: z.boolean(),
  })
  .register(apiNames, { id: "KanbanCalendarEvent" });

export const BOARD_REFUSED = {
  description: "Invalid input, not a kanban board, or the action failed",
  schema: errorSchema,
};

export const boardParams = uuidParam("boardId", "Board");

export const cardParams = boardParams.extend({
  itemId: z.string().describe("Card id inside the board"),
});

export const boardListQuery = z.object({
  category: z.string().optional().describe("Only boards in this folder"),
  status: z.string().optional().describe("Only boards with at least one top-level card in this status id"),
  q: searchQuery.describe("Case-insensitive match on the board title or any top-level card text"),
  view: z
    .enum(ListView)
    .default(ListView.FULL)
    .describe("full returns every card, summary returns card counts per status instead"),
  ...pageFields,
});

export const boardCreateBody = z.object({
  title: required("Title"),
  category: categoryField,
  statuses: z
    .array(kanbanStatusSchema)
    .optional()
    .describe("Columns for the new board, the default columns when left out"),
});

export const boardUpdateBody = z.object({
  title: z.string().optional(),
  category: z.string().optional().describe("Moving needs create on the target folder and delete on the board"),
});

export const statusesBody = z.object({
  statuses: z
    .array(kanbanStatusSchema, { error: "Statuses array is required" })
    .describe("The full new column list. Cards in a removed column move to the lowest-order one"),
});

export const cardCreateBody = z.object({
  text: required("Text"),
  status: z.string().optional().describe("Status id, defaults to the board's first column"),
  description: z.string().optional(),
});

export const cardUpdateBody = z.object({
  text: z.string().optional().describe("Empty text is ignored"),
  priority: z.union([prioritySchema, z.literal("")]).optional().describe("Empty string clears it"),
  score: z
    .union([z.number(), z.string().regex(/^-?\d*$/, "Score must be a number")])
    .optional()
    .describe("Empty string clears it"),
  assignee: z.string().optional().describe("Username, empty string clears it"),
  reminder: reminderSchema.nullable().optional().describe("null clears it"),
});

export const cardStatusBody = z.object({
  status: required("Status").describe("Status id of the target column"),
});

export const cardAssignBody = z.object({
  assignee: z.string().nullish().describe("Username. Empty or missing clears the assignee"),
});

export const cardReminderBody = z.object({
  datetime: required("Datetime")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Datetime must be a valid date")
    .describe("When the reminder fires. Any date Date.parse accepts, ISO 8601 recommended"),
});
