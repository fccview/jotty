import { z } from "zod";
import { apiNames } from "@/app/_schemas/api/names";
import { AUDIT_CATEGORIES, AUDIT_LOG_LEVELS } from "@/app/_types/audit";
import { LOG_WINDOW_DAYS } from "@/app/_consts/logs";
import { timestamp } from "./common";
import { validateNoPathTraversal } from "@/app/_utils/path-utils";

export enum LogExportFormat {
  JSON = "json",
  CSV = "csv",
}

enum BooleanParam {
  TRUE = "true",
  FALSE = "false",
}

const DEFAULT_LIMIT = 50;

export const auditLevelSchema = z.enum(AUDIT_LOG_LEVELS);
export const auditCategorySchema = z.enum(AUDIT_CATEGORIES);

const count = (fallback: number, label: string) =>
  z.coerce.number().int().min(0).default(fallback).describe(label);

const logFilterFields = {
  username: z
    .string()
    .refine(validateNoPathTraversal, "Invalid username")
    .optional()
    .describe("Only this user's entries. Admin only, everybody else always gets their own"),
  action: z.string().optional().describe("Action name, such as login or checklist_created"),
  category: auditCategorySchema.optional(),
  level: auditLevelSchema.optional(),
  startDate: z.string().optional().describe(`ISO 8601 start of the range, defaults to ${LOG_WINDOW_DAYS} days before endDate`),
  endDate: z.string().optional().describe("ISO 8601 end of the range, defaults to now"),
};

export const logListQuery = z.object({
  ...logFilterFields,
  success: z
    .enum(BooleanParam)
    .optional()
    .transform((value) => (value === undefined ? undefined : value === BooleanParam.TRUE))
    .describe("Only entries that succeeded, or only ones that failed"),
  limit: count(DEFAULT_LIMIT, "How many entries to return"),
  offset: count(0, "How many entries to skip"),
});

export const logExportBody = z.object({
  format: z.enum(LogExportFormat, { error: "Invalid format. Must be 'json' or 'csv'" }),
  filters: z
    .object({
      ...logFilterFields,
      success: z.boolean().optional(),
      limit: z.number().int().min(0).optional().describe("Most recent entries to keep, all when left out"),
    })
    .default({})
    .describe("The same filters as GET /logs"),
});

export const auditLogSchema = z
  .object({
    id: z.string().describe("Unix timestamp, as a string"),
    uuid: z.string(),
    timestamp,
    level: auditLevelSchema,
    username: z.string(),
    action: z.string(),
    category: auditCategorySchema,
    resourceType: z.string().nullish(),
    resourceId: z.string().nullish(),
    resourceTitle: z.string().nullish(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    ipAddress: z.string(),
    userAgent: z.string(),
    success: z.boolean(),
    errorMessage: z.string().nullish(),
    duration: z.number().optional(),
  })
  .register(apiNames, { id: "AuditLogEntry" });

export const logPageSchema = z.object({
  success: z.literal(true),
  logs: z.array(auditLogSchema),
  total: z.number().describe("Matching entries before limit and offset"),
});

export const logStatsSchema = z
  .object({
    totalLogs: z.number(),
    logsByLevel: z.record(z.string(), z.number()),
    logsByCategory: z.record(z.string(), z.number()),
    topActions: z.array(z.object({ action: z.string(), count: z.number() })),
    topUsers: z.array(z.object({ username: z.string(), count: z.number() })),
    recentActivity: z.array(auditLogSchema),
  })
  .register(apiNames, { id: "AuditLogStats" });

export const cleanupSchema = z.object({
  success: z.boolean(),
  deletedFiles: z.number(),
  error: z.string().optional(),
});

export const logFileSchema = z.string().describe("JSON array of entries, or CSV when format is csv");
