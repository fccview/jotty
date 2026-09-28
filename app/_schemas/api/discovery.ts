import { z } from "zod";
import { apiNames } from "@/app/_schemas/api/names";
import { ItemTypes } from "@/app/_types/enums";

export const SEARCH_MIN_LEN = 2;

const TOO_SHORT = `Query must be at least ${SEARCH_MIN_LEN} characters`;

const tally = z.record(z.string(), z.number());

export const categoryEntrySchema = z
  .object({
    name: z.string(),
    path: z.string().describe("Full path, parent categories included"),
    count: z.number().describe("Items directly in this category"),
    level: z.number().describe("Nesting depth, 0 for top-level"),
  })
  .register(apiNames, { id: "CategoryEntry" });

export const categoriesSchema = z.object({
  categories: z.object({
    notes: z.array(categoryEntrySchema),
    checklists: z.array(categoryEntrySchema),
  }),
});

export const searchParamsSchema = z.object({
  q: z
    .string({ error: TOO_SHORT })
    .refine((q) => q.trim().length >= SEARCH_MIN_LEN, TOO_SHORT)
    .describe(`Text to look for, at least ${SEARCH_MIN_LEN} characters`),
  type: z
    .enum(ItemTypes)
    .optional()
    .describe("Only notes or only checklists, both when left out"),
});

export const searchHitSchema = z
  .object({
    uuid: z.string().optional().describe("Item uuid, the id every other route takes"),
    slug: z.string().describe("File name of the match, without extension"),
    id: z
      .string()
      .meta({ deprecated: true })
      .describe("Deprecated, the same value as slug. Use uuid to address the item"),
    type: z.enum(ItemTypes),
    title: z.string(),
    category: z.string(),
    excerpt: z.string().optional().describe("The first matching line, when it is not just the title"),
  })
  .register(apiNames, { id: "SearchHit" });

export const searchResultsSchema = z.object({
  query: z.string(),
  results: z.array(searchHitSchema),
  total: z.number(),
});

export const summaryQuery = z.object({
  username: z
    .string()
    .optional()
    .describe("Whose summary to return, yours when left out. Admin only for anybody else"),
});

const completion = {
  total: z.number(),
  completed: z.number(),
  completionRate: z.number().describe("Percentage, rounded"),
};

export const summarySchema = z
  .object({
    username: z.string(),
    notes: z.object({ total: z.number(), categories: tally }),
    checklists: z.object({
      total: z.number(),
      categories: tally,
      types: tally.describe("Checklists per type"),
    }),
    items: z.object({ ...completion, pending: z.number() }),
    tasks: z.object({
      ...completion,
      inProgress: z.number(),
      todo: z.number(),
    }),
  })
  .register(apiNames, { id: "Summary" });
