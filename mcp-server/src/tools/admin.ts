import { z } from "zod";
import type { ToolModule } from "./types.js";
import { json, run } from "./shared.js";

/**
 * Admin-leaning endpoints: data exports and audit logs. Many of these require
 * admin permissions on the remote instance; non-admin callers will receive a
 * 403 from Jotty, surfaced as an MCP error result.
 */
export const adminModule: ToolModule = {
  register(server, client) {
    // POST /api/exports
    server.registerTool(
      "request_export",
      {
        title: "Request data export",
        description:
          "Initiate a data export. type is one of all_checklists_notes, user_checklists_notes (needs username), all_users_data, whole_data_folder. Returns a downloadUrl.",
        inputSchema: {
          type: z
            .enum([
              "all_checklists_notes",
              "user_checklists_notes",
              "all_users_data",
              "whole_data_folder",
            ])
            .describe("Export type."),
          username: z
            .string()
            .optional()
            .describe("Required only for user_checklists_notes."),
        },
      },
      async (args) =>
        run(() =>
          json(
            client.post("/api/exports", {
              type: args.type,
              username: args.username,
            }),
          ),
        ),
    );

    // GET /api/exports
    server.registerTool(
      "get_export_progress",
      {
        title: "Get export progress",
        description: "Get the current progress of an ongoing export operation.",
      },
      async () => run(() => json(client.get("/api/exports"))),
    );

    // GET /api/logs
    server.registerTool(
      "list_logs",
      {
        title: "List audit logs",
        description:
          "Retrieve audit logs with filtering and pagination. Regular users only see their own logs; admins can filter by username.",
        inputSchema: {
          username: z.string().optional().describe("Filter by username (admin only)."),
          action: z.string().optional().describe("Filter by action type, e.g. login."),
          category: z
            .enum([
              "auth",
              "user",
              "checklist",
              "note",
              "sharing",
              "settings",
              "encryption",
              "api",
              "system",
              "file",
              "upload",
            ])
            .optional(),
          level: z
            .enum(["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"])
            .optional(),
          startDate: z.string().optional().describe("ISO 8601 start date."),
          endDate: z.string().optional().describe("ISO 8601 end date."),
          success: z.boolean().optional(),
          limit: z.number().int().positive().max(1000).optional().describe("Default 50."),
          offset: z.number().int().min(0).optional().describe("Default 0."),
        },
      },
      async (args) =>
        run(() =>
          json(
            client.get("/api/logs", {
              username: args.username,
              action: args.action,
              category: args.category,
              level: args.level,
              startDate: args.startDate,
              endDate: args.endDate,
              success: args.success,
              limit: args.limit,
              offset: args.offset,
            }),
          ),
        ),
    );

    // POST /api/logs/export
    server.registerTool(
      "export_logs",
      {
        title: "Export audit logs",
        description:
          "Export audit logs in JSON or CSV format using the same filter options as list_logs.",
        inputSchema: {
          format: z.enum(["json", "csv"]).describe("Export format."),
          filters: z
            .record(z.unknown())
            .optional()
            .describe("Filter object with the same keys as list_logs."),
        },
      },
      async (args) =>
        run(() =>
          json(
            client.post("/api/logs/export", {
              format: args.format,
              filters: args.filters ?? {},
            }),
          ),
        ),
    );

    // GET /api/logs/stats
    server.registerTool(
      "get_logs_stats",
      {
        title: "Get audit log statistics",
        description: "Aggregated audit log statistics (admin only).",
      },
      async () => run(() => json(client.get("/api/logs/stats"))),
    );
  },
};