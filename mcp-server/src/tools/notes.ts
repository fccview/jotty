import { z } from "zod";
import type { ToolModule } from "./types.js";
import { json, run } from "./shared.js";

/**
 * Notes — markdown documents under /api/notes. content is GitHub-Flavoured
 * Markdown. Each note has a UUID id and an optional category.
 */
export const notesModule: ToolModule = {
  register(server, client) {
    // GET /api/notes
    server.registerTool(
      "list_notes",
      {
        title: "List notes",
        description:
          "List all notes for the authenticated user. Optional filters: category and search query q (matches title or content).",
        inputSchema: {
          category: z.string().optional().describe("Filter by category name."),
          q: z.string().optional().describe("Search title or content."),
        },
      },
      async (args) =>
        run(() =>
          json(
            client.get("/api/notes", {
              category: args.category,
              q: args.q,
            }),
          ),
        ),
    );

    // POST /api/notes
    server.registerTool(
      "create_note",
      {
        title: "Create note",
        description:
          "Create a new markdown note. content defaults to empty; category defaults to 'Uncategorized'.",
        inputSchema: {
          title: z.string().describe("Note title."),
          content: z
            .string()
            .optional()
            .describe("Markdown content (defaults to empty)."),
          category: z.string().optional().describe("Category (defaults to Uncategorized)."),
        },
      },
      async (args) =>
        run(() =>
          json(
            client.post("/api/notes", {
              title: args.title,
              content: args.content ?? "",
              category: args.category ?? "Uncategorized",
            }),
          ),
        ),
    );

    // GET /api/notes/{noteId}
    server.registerTool(
      "get_note",
      {
        title: "Get note",
        description: "Retrieve a single note by UUID, including its content.",
        inputSchema: {
          noteId: z.string().describe("UUID of the note."),
        },
      },
      async (args) =>
        run(() => json(client.get(`/api/notes/${args.noteId}`))),
    );

    // PUT /api/notes/{noteId}
    server.registerTool(
      "update_note",
      {
        title: "Update note",
        description:
          "Update a note's title, content and/or category. Omitted fields are left unchanged.",
        inputSchema: {
          noteId: z.string().describe("UUID of the note."),
          title: z.string().optional(),
          content: z.string().optional().describe("New markdown content."),
          category: z.string().optional(),
        },
      },
      async (args) =>
        run(() =>
          json(
            client.put(`/api/notes/${args.noteId}`, {
              title: args.title,
              content: args.content,
              category: args.category,
            }),
          ),
        ),
    );

    // DELETE /api/notes/{noteId}
    server.registerTool(
      "delete_note",
      {
        title: "Delete note",
        description: "Delete a note by UUID.",
        inputSchema: {
          noteId: z.string().describe("UUID of the note to delete."),
        },
      },
      async (args) =>
        run(() => json(client.delete(`/api/notes/${args.noteId}`))),
    );
  },
};