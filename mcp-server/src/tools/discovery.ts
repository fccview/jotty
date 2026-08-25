import { z } from "zod";
import type { ToolModule } from "./types.js";
import { json, run } from "./shared.js";

/**
 * Organisation & discovery endpoints: categories, summary statistics, and
 * cross-content full-text search.
 */
export const discoveryModule: ToolModule = {
  register(server, client) {
    // GET /api/categories
    server.registerTool(
      "list_categories",
      {
        title: "List categories",
        description:
          "List all categories for notes and checklists for the authenticated user (archived categories excluded).",
      },
      async () => run(() => json(client.get("/api/categories"))),
    );

    // GET /api/summary
    server.registerTool(
      "get_summary",
      {
        title: "Get summary statistics",
        description:
          "Get statistics about notes, checklists, items and tasks with category breakdowns. Admins may query another user with username.",
        inputSchema: {
          username: z
            .string()
            .optional()
            .describe("Username to query (admin only; defaults to the authenticated user)."),
        },
      },
      async (args) =>
        run(() =>
          json(
            client.get("/api/summary", {
              username: args.username,
            }),
          ),
        ),
    );

    // GET /api/search
    server.registerTool(
      "search",
      {
        title: "Search notes and checklists",
        description:
          "Full-text search across notes and checklists. type filters to 'note' or 'checklist'. q must be at least 2 characters.",
        inputSchema: {
          q: z.string().min(2).describe("Search query (min 2 characters)."),
          type: z
            .enum(["note", "checklist"])
            .optional()
            .describe("Restrict results to notes or checklists."),
        },
      },
      async (args) =>
        run(() =>
          json(
            client.get("/api/search", {
              q: args.q,
              type: args.type,
            }),
          ),
        ),
    );
  },
};