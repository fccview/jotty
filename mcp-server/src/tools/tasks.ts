import { z } from "zod";
import type { ToolModule } from "./types.js";
import { json, run } from "./shared.js";

/**
 * A "status" object used to define Kanban columns. Reused across create_task
 * and the status endpoints.
 */
const statusShape = {
  id: z.string().describe("Unique status id, e.g. 'todo' or 'review'."),
  label: z.string().describe("Display label for the column."),
  order: z.number().optional().describe("Display order."),
  color: z.string().optional().describe("Hex color, e.g. '#3b82f6'."),
};

/**
 * Tasks — task-type checklists with Kanban columns, exposed via /api/tasks.
 * Items are addressed by dot-notation index paths; statuses define the board
 * columns.
 */
export const tasksModule: ToolModule = {
  register(server, client) {
    // GET /api/tasks
    server.registerTool(
      "list_tasks",
      {
        title: "List tasks",
        description:
          "List all task checklists for the authenticated user. Optional filters: category, status (lists containing an item with this status), and search q.",
        inputSchema: {
          category: z.string().optional(),
          status: z
            .string()
            .optional()
            .describe("Only return tasks that contain an item with this status."),
          q: z.string().optional().describe("Search title or item text."),
        },
      },
      async (args) =>
        run(() =>
          json(
            client.get("/api/tasks", {
              category: args.category,
              status: args.status,
              q: args.q,
            }),
          ),
        ),
    );

    // POST /api/tasks
    server.registerTool(
      "create_task",
      {
        title: "Create task",
        description:
          "Create a new task checklist (Kanban). statuses defines the columns; defaults to todo/in_progress/completed.",
        inputSchema: {
          title: z.string().describe("Task list title."),
          category: z.string().optional().describe("Category (defaults to Uncategorized)."),
          statuses: z
            .array(z.object(statusShape))
            .optional()
            .describe("Custom Kanban columns."),
        },
      },
      async (args) =>
        run(() =>
          json(
            client.post("/api/tasks", {
              title: args.title,
              category: args.category ?? "Uncategorized",
              statuses: args.statuses,
            }),
          ),
        ),
    );

    // GET /api/tasks/{taskId}
    server.registerTool(
      "get_task",
      {
        title: "Get task",
        description: "Retrieve a single task checklist by UUID.",
        inputSchema: {
          taskId: z.string().describe("UUID of the task."),
        },
      },
      async (args) => run(() => json(client.get(`/api/tasks/${args.taskId}`))),
    );

    // PUT /api/tasks/{taskId}
    server.registerTool(
      "update_task",
      {
        title: "Update task",
        description: "Update a task's title and/or category.",
        inputSchema: {
          taskId: z.string().describe("UUID of the task."),
          title: z.string().optional(),
          category: z.string().optional(),
        },
      },
      async (args) =>
        run(() =>
          json(
            client.put(`/api/tasks/${args.taskId}`, {
              title: args.title,
              category: args.category,
            }),
          ),
        ),
    );

    // DELETE /api/tasks/{taskId}
    server.registerTool(
      "delete_task",
      {
        title: "Delete task",
        description: "Delete a task checklist by UUID.",
        inputSchema: {
          taskId: z.string().describe("UUID of the task."),
        },
      },
      async (args) =>
        run(() => json(client.delete(`/api/tasks/${args.taskId}`))),
    );

    // GET /api/tasks/{taskId}/statuses
    server.registerTool(
      "get_task_statuses",
      {
        title: "Get task statuses",
        description: "Retrieve the Kanban column statuses for a task.",
        inputSchema: {
          taskId: z.string().describe("UUID of the task."),
        },
      },
      async (args) =>
        run(() => json(client.get(`/api/tasks/${args.taskId}/statuses`))),
    );

    // POST /api/tasks/{taskId}/statuses
    server.registerTool(
      "create_task_status",
      {
        title: "Create task status",
        description: "Add a new Kanban column status to a task.",
        inputSchema: {
          taskId: z.string().describe("UUID of the task."),
          id: z.string().describe("Unique status id."),
          label: z.string().describe("Display label."),
          color: z.string().optional().describe("Hex color."),
          order: z.number().optional().describe("Display order (defaults to last)."),
        },
      },
      async (args) =>
        run(() =>
          json(
            client.post(`/api/tasks/${args.taskId}/statuses`, {
              id: args.id,
              label: args.label,
              color: args.color,
              order: args.order,
            }),
          ),
        ),
    );

    // PUT /api/tasks/{taskId}/statuses/{statusId}
    server.registerTool(
      "update_task_status",
      {
        title: "Update task status",
        description: "Update a Kanban column status (label, color, order).",
        inputSchema: {
          taskId: z.string().describe("UUID of the task."),
          statusId: z.string().describe("Status id to update."),
          label: z.string().optional(),
          color: z.string().optional(),
          order: z.number().optional(),
        },
      },
      async (args) =>
        run(() =>
          json(
            client.put(
              `/api/tasks/${args.taskId}/statuses/${args.statusId}`,
              {
                label: args.label,
                color: args.color,
                order: args.order,
              },
            ),
          ),
        ),
    );

    // DELETE /api/tasks/{taskId}/statuses/{statusId}
    server.registerTool(
      "delete_task_status",
      {
        title: "Delete task status",
        description:
          "Delete a Kanban column. Items with this status move to the first available status.",
        inputSchema: {
          taskId: z.string().describe("UUID of the task."),
          statusId: z.string().describe("Status id to delete."),
        },
      },
      async (args) =>
        run(() =>
          json(client.delete(`/api/tasks/${args.taskId}/statuses/${args.statusId}`)),
        ),
    );

    // POST /api/tasks/{taskId}/items
    server.registerTool(
      "create_task_item",
      {
        title: "Create task item",
        description:
          "Add an item to a task. Use parentIndex (dot path) to nest under an existing item. status defaults to 'todo'.",
        inputSchema: {
          taskId: z.string().describe("UUID of the task."),
          text: z.string().describe("Item text."),
          status: z.string().optional().describe("Initial status (defaults to todo)."),
          parentIndex: z
            .string()
            .optional()
            .describe("Dot-notation index path of the parent item."),
        },
      },
      async (args) =>
        run(() =>
          json(
            client.post(`/api/tasks/${args.taskId}/items`, {
              text: args.text,
              status: args.status,
              parentIndex: args.parentIndex,
            }),
          ),
        ),
    );

    // GET /api/tasks/{taskId}/items/{itemIndex}
    server.registerTool(
      "get_task_item",
      {
        title: "Get task item",
        description: "Retrieve a single task item by dot-notation index path.",
        inputSchema: {
          taskId: z.string().describe("UUID of the task."),
          itemIndex: z
            .string()
            .describe("Dot-notation index path (e.g. '0' or '0.1')."),
        },
      },
      async (args) =>
        run(() =>
          json(client.get(`/api/tasks/${args.taskId}/items/${args.itemIndex}`)),
        ),
    );

    // PUT /api/tasks/{taskId}/items/{itemIndex}/status
    server.registerTool(
      "move_task_item",
      {
        title: "Move task item",
        description: "Move a task item to a different Kanban column (change its status).",
        inputSchema: {
          taskId: z.string().describe("UUID of the task."),
          itemIndex: z
            .string()
            .describe("Dot-notation index path of the item."),
          status: z.string().describe("New status id."),
        },
      },
      async (args) =>
        run(() =>
          json(
            client.put(`/api/tasks/${args.taskId}/items/${args.itemIndex}/status`, {
              status: args.status,
            }),
          ),
        ),
    );

    // DELETE /api/tasks/{taskId}/items/{itemIndex}
    server.registerTool(
      "delete_task_item",
      {
        title: "Delete task item",
        description: "Delete a task item by dot-notation index path.",
        inputSchema: {
          taskId: z.string().describe("UUID of the task."),
          itemIndex: z
            .string()
            .describe("Dot-notation index path of the item to delete."),
        },
      },
      async (args) =>
        run(() =>
          json(client.delete(`/api/tasks/${args.taskId}/items/${args.itemIndex}`)),
        ),
    );
  },
};