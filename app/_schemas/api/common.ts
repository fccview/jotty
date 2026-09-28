import { z } from "zod";
import { apiNames } from "@/app/_schemas/api/names";
import { UNCATEGORIZED } from "@/app/_consts/notes";

export const errorSchema = z
  .object({
    error: z.string(),
    details: z.array(z.unknown()).optional(),
  })
  .register(apiNames, { id: "Error" });

export const okSchema = z.object({ success: z.literal(true) }).register(apiNames, { id: "Ok" });

export const envelope = <T extends z.ZodType>(data: T) =>
  z.object({ success: z.literal(true), data });

export const required = (label: string) =>
  z.string({ error: `${label} is required` }).min(1, `${label} is required`);

export const categoryField = z
  .string()
  .default(UNCATEGORIZED)
  .describe("Folder path, nested with '/'");

export const timestamp = z.string().describe("ISO 8601 timestamp");

export const searchQuery = z
  .string()
  .optional()
  .describe("Case-insensitive text filter");

export enum ListView {
  FULL = "full",
  SUMMARY = "summary",
}

export const pageFields = {
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Most results to return, all when left out"),
  offset: z.coerce.number().int().min(0).default(0).describe("How many results to skip"),
};

export const sliceQuery = z.object({
  offset: z.coerce.number().int().min(0).default(0).describe("First character of content to return"),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Most characters of content to return, all when left out"),
});

export const page = <T>(rows: T[], { limit, offset }: { limit?: number; offset: number }): T[] =>
  rows.slice(offset, limit === undefined ? undefined : offset + limit);

export const totalField = z.number().optional().describe("Matching results before limit and offset");

export const uuidParam = (name: string, label: string) =>
  z.object({ [name]: z.string().describe(`${label} uuid`) });

export const ERRORS = {
  400: { description: "Invalid input", schema: errorSchema },
  401: { description: "Missing or invalid API key", schema: errorSchema },
  403: { description: "Not allowed for this user", schema: errorSchema },
  404: { description: "Not found or not visible to this user", schema: errorSchema },
  500: { description: "Server error", schema: errorSchema },
} as const;
