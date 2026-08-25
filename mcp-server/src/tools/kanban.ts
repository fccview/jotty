import { z } from "zod";
import type { ToolModule } from "./types.js";
import { json, run } from "./shared.js";

/**
 * Kanban boards — the dedicated /api/kanban surface for kanban-type lists.
 * Unlike /api/tasks (index-based), kanban items are addressed by their item id,
 * and boards support assignees, reminders and an ICS calendar export.
 */
export const kanbanModule: ToolModule = {
  register(server, client) {
    // GET /api/kanban
    server.registerTool(
      "list_boards",
      {
        title: "List kanban boards",
        description:
          "List all kanban boards for the authenticated user. Optional filters: category, status (boards containing an item with this status), and search q.",
        inputSchema: {
          category: z.string().optional(),
          status: z.string().optional(),
          q: z.string().optional().describe("Search title or item text."),
        },
      },
      async (args) =>
        run(() =>
          json(
            client.get("/api/kanban", {
              category: args.category,
              status: args.status,
              q: args.q,
            }),
          ),
        ),
    );

    // POST /api/kanban
    server.registerTool(
      "create_board",
      {
        title: "Create kanban board",
        description:
          "Create a new kanban board. statuses defines the columns; defaults to todo/in_progress/completed.",
        inputSchema: {
          title: z.string().describe("Board title."),
          category: z.string().optional().describe("Category (defaults to Uncategorized)."),
          statuses: z
            .array(
              z.object({
                id: z.string(),
                label: z.string(),
                order: z.number().optional(),
                color: z.string().optional(),
              }),
            )
            .optional()
            .describe("Custom Kanban columns."),
        },
      },
      async (args) =>
        run(() =>
          json(
            client.post("/api/kanban", {
              title: args.title,
              category: args.category ?? "Uncategorized",
              statuses: args.statuses,
            }),
          ),
        ),
    );

    // GET /api/kanban/{boardId}
    server.registerTool(
      "get_board",
      {
        title: "Get kanban board",
        description: "Retrieve a single kanban board by UUID.",
        inputSchema: {
          boardId: z.string().describe("UUID of the board."),
        },
      },
      async (args) =>
        run(() => json(client.get(`/api/kanban/${args.boardId}`))),
    );

    // PUT /api/kanban/{boardId}
    server.registerTool(
      "update_board",
      {
        title: "Update kanban board",
        description: "Update a board's title and/or category.",
        inputSchema: {
          boardId: z.string().describe("UUID of the board."),
          title: z.string().optional(),
          category: z.string().optional(),
        },
      },
      async (args) =>
        run(() =>
          json(
            client.put(`/api/kanban/${args.boardId}`, {
              title: args.title,
              category: args.category,
            }),
          ),
        ),
    );

    // DELETE /api/kanban/{boardId}
    server.registerTool(
      "delete_board",
      {
        title: "Delete kanban board",
        description: "Delete a kanban board by UUID.",
        inputSchema: {
          boardId: z.string().describe("UUID of the board."),
        },
      },
      async (args) =>
        run(() => json(client.delete(`/api/kanban/${args.boardId}`))),
    );

    // PUT /api/kanban/{boardId}/statuses
    server.registerTool(
      "set_board_statuses",
      {
        title: "Set board statuses",
        description:
          "Replace the full set of Kanban column statuses for a board. Provide the complete statuses array.",
        inputSchema: {
          boardId: z.string().describe("UUID of the board."),
          statuses: z
            .array(
              z.object({
                id: z.string(),
                label: z.string(),
                order: z.number().optional(),
                color: z.string().optional(),
              }),
            )
            .describe("Full statuses array to set."),
        },
      },
      async (args) =>
        run(() =>
          json(
            client.put(`/api/kanban/${args.boardId}/statuses`, {
              statuses: args.statuses,
            }),
          ),
        ),
    );

    // POST /api/kanban/{boardId}/items
    server.registerTool(
      "create_board_item",
      {
        title: "Create board item",
        description: "Add an item to a kanban board. Optional status and description.",
        inputSchema: {
          boardId: z.string().describe("UUID of the board."),
          text: z.string().describe("Item text."),
          status: z.string().optional().describe("Initial status (defaults to todo)."),
          description: z.string().optional().describe("Item description/notes."),
        },
      },
      async (args) =>
        run(() =>
          json(
            client.post(`/api/kanban/${args.boardId}/items`, {
              text: args.text,
              status: args.status,
              description: args.description,
            }),
          ),
        ),
    );

    // PUT /api/kanban/{boardId}/items/{itemId}
    server.registerTool(
      "update_board_item",
      {
        title: "Update board item",
        description:
          "Update a kanban item's text, priority, score, assignee and/or reminder. Omitted fields are left unchanged.",
        inputSchema: {
          boardId: z.string().describe("UUID of the board."),
          itemId: z.string().describe("Item id to update."),
          text: z.string().optional(),
          priority: z
            .enum(["critical", "high", "medium", "low", "none"])
            .optional(),
          score: z.number().optional(),
          assignee: z.string().optional().describe("Username to assign the item to."),
          reminder: z
            .object({
              datetime: z.string(),
              notified: z.boolean().optional(),
            })
            .optional()
            .describe("Reminder object; set to null to clear."),
        },
      },
      async (args) =>
        run(() =>
          json(
            client.put(`/api/kanban/${args.boardId}/items/${args.itemId}`, {
              text: args.text,
              priority: args.priority,
              score: args.score,
              assignee: args.assignee,
              reminder: args.reminder,
            }),
          ),
        ),
    );

    // DELETE /api/kanban/{boardId}/items/{itemId}
    server.registerTool(
      "delete_board_item",
      {
        title: "Delete board item",
        description: "Delete a kanban item by id.",
        inputSchema: {
          boardId: z.string().describe("UUID of the board."),
          itemId: z.string().describe("Item id to delete."),
        },
      },
      async (args) =>
        run(() =>
          json(client.delete(`/api/kanban/${args.boardId}/items/${args.itemId}`)),
        ),
    );

    // PUT /api/kanban/{boardId}/items/{itemId}/status
    server.registerTool(
      "move_board_item",
      {
        title: "Move board item",
        description: "Move a kanban item to a different column (change its status).",
        inputSchema: {
          boardId: z.string().describe("UUID of the board."),
          itemId: z.string().describe("Item id to move."),
          status: z.string().describe("New status id."),
        },
      },
      async (args) =>
        run(() =>
          json(
            client.put(`/api/kanban/${args.boardId}/items/${args.itemId}/status`, {
              status: args.status,
            }),
          ),
        ),
    );

    // PUT /api/kanban/{boardId}/items/{itemId}/assign
    server.registerTool(
      "assign_board_item",
      {
        title: "Assign board item",
        description: "Assign a kanban item to a user (pass empty string to unassign).",
        inputSchema: {
          boardId: z.string().describe("UUID of the board."),
          itemId: z.string().describe("Item id to assign."),
          assignee: z.string().describe("Username to assign to (empty to clear)."),
        },
      },
      async (args) =>
        run(() =>
          json(
            client.put(`/api/kanban/${args.boardId}/items/${args.itemId}/assign`, {
              assignee: args.assignee,
            }),
          ),
        ),
    );

    // PUT /api/kanban/{boardId}/items/{itemId}/reminder
    server.registerTool(
      "set_board_item_reminder",
      {
        title: "Set board item reminder",
        description: "Set a due-date/time reminder on a kanban item.",
        inputSchema: {
          boardId: z.string().describe("UUID of the board."),
          itemId: z.string().describe("Item id."),
          datetime: z.string().describe("ISO 8601 datetime for the reminder."),
        },
      },
      async (args) =>
        run(() =>
          json(
            client.put(`/api/kanban/${args.boardId}/items/${args.itemId}/reminder`, {
              datetime: args.datetime,
            }),
          ),
        ),
    );

    // DELETE /api/kanban/{boardId}/items/{itemId}/reminder
    server.registerTool(
      "clear_board_item_reminder",
      {
        title: "Clear board item reminder",
        description: "Remove the reminder from a kanban item.",
        inputSchema: {
          boardId: z.string().describe("UUID of the board."),
          itemId: z.string().describe("Item id."),
        },
      },
      async (args) =>
        run(() =>
          json(
            client.delete(`/api/kanban/${args.boardId}/items/${args.itemId}/reminder`),
          ),
        ),
    );

    // GET /api/kanban/{boardId}/calendar
    server.registerTool(
      "get_board_calendar",
      {
        title: "Get board calendar",
        description:
          "Get calendar events for items on a kanban board that have start/target dates. Returns JSON events.",
        inputSchema: {
          boardId: z.string().describe("UUID of the board."),
        },
      },
      async (args) =>
        run(() =>
          json(client.get(`/api/kanban/${args.boardId}/calendar`)),
        ),
    );
  },
};