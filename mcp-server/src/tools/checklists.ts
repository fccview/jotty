import { z } from "zod";
import type { ToolModule } from "./types.js";
import { json, run } from "./shared.js";

/**
 * Checklists — both "simple" and "task"/"kanban" type lists live under
 * /api/checklists. Items are addressed by dot-notation index paths (e.g. "0.1")
 * so nested sub-items can be targeted. See howto/API.md for the full reference.
 */
export const checklistsModule: ToolModule = {
  register(server, client) {
    // GET /api/checklists
    server.registerTool(
      "list_checklists",
      {
        title: "List checklists",
        description:
          "List all checklists for the authenticated user. Optional filters: category, type (simple|task|kanban), and a search query q (matches title or item text).",
        inputSchema: {
          category: z.string().optional().describe("Filter by category name."),
          type: z
            .enum(["simple", "task", "kanban"])
            .optional()
            .describe("Filter by checklist type."),
          q: z.string().optional().describe("Search title or item text."),
        },
      },
      async (args) =>
        run(() =>
          json(
            client.get("/api/checklists", {
              category: args.category,
              type: args.type,
              q: args.q,
            }),
          ),
        ),
    );

    // POST /api/checklists
    server.registerTool(
      "create_checklist",
      {
        title: "Create checklist",
        description:
          "Create a new checklist. type defaults to 'simple'; use 'task' or 'kanban' for advanced lists. category defaults to 'Uncategorized'.",
        inputSchema: {
          title: z.string().describe("Title of the new checklist."),
          category: z.string().optional().describe("Category (defaults to Uncategorized)."),
          type: z
            .enum(["simple", "task", "kanban"])
            .optional()
            .describe("Checklist type (defaults to simple)."),
        },
      },
      async (args) =>
        run(() =>
          json(
            client.post("/api/checklists", {
              title: args.title,
              category: args.category ?? "Uncategorized",
              type: args.type ?? "simple",
            }),
          ),
        ),
    );

    // PUT /api/checklists/{listId}
    server.registerTool(
      "update_checklist",
      {
        title: "Update checklist",
        description: "Update a checklist's title and/or category.",
        inputSchema: {
          listId: z.string().describe("UUID of the checklist to update."),
          title: z.string().optional().describe("New title."),
          category: z.string().optional().describe("New category."),
        },
      },
      async (args) =>
        run(() =>
          json(
            client.put(`/api/checklists/${args.listId}`, {
              title: args.title,
              category: args.category,
            }),
          ),
        ),
    );

    // DELETE /api/checklists/{listId}
    server.registerTool(
      "delete_checklist",
      {
        title: "Delete checklist",
        description: "Delete a checklist by UUID.",
        inputSchema: {
          listId: z.string().describe("UUID of the checklist to delete."),
        },
      },
      async (args) =>
        run(() => json(client.delete(`/api/checklists/${args.listId}`))),
    );

    // POST /api/checklists/{listId}/items
    server.registerTool(
      "create_checklist_item",
      {
        title: "Create checklist item",
        description:
          "Add an item to a checklist. For task/kanban lists you may pass a status (e.g. todo|in_progress|completed) and time. Use parentIndex (dot path like '0' or '0.1') to create a nested sub-item.",
        inputSchema: {
          listId: z.string().describe("UUID of the checklist."),
          text: z.string().describe("Item text."),
          status: z.string().optional().describe("Initial status (task/kanban lists)."),
          time: z
            .union([z.literal(0), z.array(z.record(z.unknown()))])
            .optional()
            .describe("Time tracking value: 0 or an array of time entries."),
          parentIndex: z
            .string()
            .optional()
            .describe("Dot-notation index path of the parent item to nest under."),
        },
      },
      async (args) =>
        run(() =>
          json(
            client.post(`/api/checklists/${args.listId}/items`, {
              text: args.text,
              status: args.status,
              time: args.time,
              parentIndex: args.parentIndex,
            }),
          ),
        ),
    );

    // PATCH /api/checklists/{listId}/items/{itemIndex}
    server.registerTool(
      "update_checklist_item",
      {
        title: "Update checklist item",
        description:
          "Update one or more fields of a checklist item. itemIndex is a dot path (e.g. '0.1') for nested items. Omitted fields are left unchanged.",
        inputSchema: {
          listId: z.string().describe("UUID of the checklist."),
          itemIndex: z
            .string()
            .describe("Dot-notation index path of the item (e.g. '0' or '0.1')."),
          text: z.string().optional(),
          description: z.string().optional(),
          priority: z
            .enum(["critical", "high", "medium", "low", "none"])
            .optional(),
          score: z.number().optional(),
          startDate: z.string().optional().describe("ISO date string."),
          targetDate: z.string().optional().describe("ISO date string."),
          estimatedTime: z.number().optional().describe("Estimated hours."),
        },
      },
      async (args) =>
        run(() =>
          json(
            client.patch(
              `/api/checklists/${args.listId}/items/${args.itemIndex}`,
              {
                text: args.text,
                description: args.description,
                priority: args.priority,
                score: args.score,
                startDate: args.startDate,
                targetDate: args.targetDate,
                estimatedTime: args.estimatedTime,
              },
            ),
          ),
        ),
    );

    // DELETE /api/checklists/{listId}/items/{itemIndex}
    server.registerTool(
      "delete_checklist_item",
      {
        title: "Delete checklist item",
        description:
          "Delete a checklist item by dot-notation index path (e.g. '0.1').",
        inputSchema: {
          listId: z.string().describe("UUID of the checklist."),
          itemIndex: z
            .string()
            .describe("Dot-notation index path of the item to delete."),
        },
      },
      async (args) =>
        run(() =>
          json(client.delete(`/api/checklists/${args.listId}/items/${args.itemIndex}`)),
        ),
    );

    // PUT /api/checklists/{listId}/items/{itemIndex}/check
    server.registerTool(
      "check_item",
      {
        title: "Check item",
        description: "Mark a checklist item as completed.",
        inputSchema: {
          listId: z.string().describe("UUID of the checklist."),
          itemIndex: z
            .string()
            .describe("Dot-notation index path of the item."),
        },
      },
      async (args) =>
        run(() =>
          json(
            client.put(`/api/checklists/${args.listId}/items/${args.itemIndex}/check`),
          ),
        ),
    );

    // PUT /api/checklists/{listId}/items/{itemIndex}/uncheck
    server.registerTool(
      "uncheck_item",
      {
        title: "Uncheck item",
        description: "Mark a checklist item as incomplete.",
        inputSchema: {
          listId: z.string().describe("UUID of the checklist."),
          itemIndex: z
            .string()
            .describe("Dot-notation index path of the item."),
        },
      },
      async (args) =>
        run(() =>
          json(
            client.put(`/api/checklists/${args.listId}/items/${args.itemIndex}/uncheck`),
          ),
        ),
    );

    // PUT /api/checklists/{listId}/items/reorder
    server.registerTool(
      "reorder_checklist_items",
      {
        title: "Reorder checklist items",
        description:
          "Reorder items by dragging activeItemId relative to overItemId. position is 'before' or 'after'. Set isDropInto=true to drop activeItem as a child of overItem.",
        inputSchema: {
          listId: z.string().describe("UUID of the checklist."),
          activeItemId: z.string().describe("Item id being moved."),
          overItemId: z.string().describe("Item id it is moved relative to."),
          position: z
            .enum(["before", "after"])
            .optional()
            .describe("before|after (defaults to before)."),
          isDropInto: z
            .boolean()
            .optional()
            .describe("Drop as a child of overItemId instead of reordering siblings."),
        },
      },
      async (args) =>
        run(() =>
          json(
            client.put(`/api/checklists/${args.listId}/items/reorder`, {
              activeItemId: args.activeItemId,
              overItemId: args.overItemId,
              position: args.position ?? "before",
              isDropInto: args.isDropInto ?? false,
            }),
          ),
        ),
    );
  },
};