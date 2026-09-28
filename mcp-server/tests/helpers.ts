import { DEFAULT_CONFIG } from "../src/config/load.ts";
import type { McpConfig } from "../src/config/schema.ts";
import { createClient } from "../src/jotty/client.ts";
import type { OpenApiDocument } from "../src/jotty/openapi.ts";
import { createSpecSource } from "../src/jotty/spec.ts";
import type { ToolContext } from "../src/tools/context.ts";
import type { ToolResult } from "../src/tools/result.ts";

export const API_KEY = "ck_test";

export interface Hit {
  method: string;
  path: string;
  apiKey: string | null;
  body: unknown;
}

export interface FakeJotty {
  url: string;
  hits: Hit[];
  stop: () => Promise<void>;
}

const NOTE = { id: "n-1", title: "Milk", category: "Uncategorized", content: "" };
const CARD = { id: "c-1", text: "Write tests", status: "todo" };
const MANY_NOTES = Array.from({ length: 30 }, (_, n) => ({ ...NOTE, id: `n-${n}`, content: "x".repeat(50) }));

export const FAKE_SPEC: OpenApiDocument = {
  info: { title: "Jotty API", version: "9.9.9" },
  paths: {
    "/notes": {
      get: {
        operationId: "listNotes",
        summary: "List notes",
        tags: ["Notes"],
        parameters: [
          { name: "q", in: "query" as never, required: false, schema: { type: "string" } },
          { name: "view", in: "query" as never, required: false, schema: { type: "string", default: "full" } },
          { name: "limit", in: "query" as never, required: false, schema: { type: "integer" } },
          { name: "offset", in: "query" as never, required: false, schema: { type: "integer" } },
        ],
      },
      post: {
        operationId: "createNote",
        summary: "Create a note",
        tags: ["Notes"],
        requestBody: {
          content: {
            "application/json": {
              schema: { type: "object", properties: { title: { type: "string" }, category: { type: "string" } }, required: ["title"] },
            },
          },
        },
      },
    },
    "/notes/{noteId}": {
      get: {
        operationId: "getNote",
        summary: "Get a note",
        tags: ["Notes"],
        parameters: [{ name: "noteId", in: "path" as never, required: true, schema: { type: "string" } }],
      },
      delete: {
        operationId: "deleteNote",
        summary: "Delete a note",
        tags: ["Notes"],
        parameters: [{ name: "noteId", in: "path" as never, required: true, schema: { type: "string" } }],
      },
    },
    "/search": {
      get: {
        operationId: "search",
        summary: "Search",
        tags: ["Discovery"],
        parameters: [{ name: "q", in: "query" as never, required: true, schema: { type: "string" } }],
      },
    },
    "/tasks": {
      get: {
        operationId: "listTasks",
        summary: "List tasks",
        tags: ["Tasks"],
        parameters: [{ name: "category", in: "query" as never, required: false, schema: { type: "string" } }],
      },
    },
    "/checklists/{listId}/items/{itemIndex}/check": {
      put: {
        operationId: "checkChecklistItem",
        summary: "Check an item",
        tags: ["Checklist items"],
        parameters: [
          { name: "listId", in: "path" as never, required: true, schema: { type: "string" } },
          { name: "itemIndex", in: "path" as never, required: true, schema: { type: "string" } },
        ],
      },
    },
    "/relations/links": {
      post: {
        operationId: "connectItems",
        summary: "Link a note to another item",
        tags: ["Relations"],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { source: { type: "string" }, target: { type: "string" }, style: { type: "string" } },
                required: ["source", "target"],
              },
            },
          },
        },
      },
    },
    "/exports/{filename}": {
      get: {
        operationId: "downloadExport",
        summary: "Download an export",
        tags: ["Exports"],
        parameters: [{ name: "filename", in: "path" as never, required: true, schema: { type: "string" } }],
        responses: { "200": { content: { "application/zip": {} } } },
      },
    },
    "/kanban/{boardId}/items/{itemId}": {
      put: {
        operationId: "updateBoardItem",
        summary: "Update a card",
        tags: ["Kanban"],
        parameters: [
          { name: "boardId", in: "path" as never, required: true, schema: { type: "string" } },
          { name: "itemId", in: "path" as never, required: true, schema: { type: "string" } },
        ],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { text: { type: "string" } } } } } },
      },
    },
    "/tasks/{taskId}/statuses": {
      post: {
        operationId: "createTaskStatus",
        summary: "Add a status",
        tags: ["Tasks"],
        parameters: [{ name: "taskId", in: "path" as never, required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: { type: "object", properties: { taskId: { type: "string" }, label: { $ref: "#/components/schemas/Label" } } },
            },
          },
        },
      },
    },
  },
  components: { schemas: { Label: { type: "string", description: "Shown on the column" } } },
};

const _json = (data: unknown, status = 200) => Response.json(data, { status });

export const serveJotty = (spec: OpenApiDocument | null = FAKE_SPEC): FakeJotty => {
  const hits: Hit[] = [];
  const server = Bun.serve({
    port: 0,
    fetch: async (request) => {
      const url = new URL(request.url);
      const apiKey = request.headers.get("x-api-key");
      const text = request.method === "GET" ? "" : await request.text();
      hits.push({ method: request.method, path: `${url.pathname}${url.search}`, apiKey, body: text ? JSON.parse(text) : undefined });

      if (url.pathname === "/api/health") return _json({ status: "healthy", version: spec?.info.version ?? "1.27.0" });
      if (apiKey !== API_KEY) return _json({ error: "Unauthorized" }, 401);
      if (url.pathname === "/api/openapi.json") return spec ? _json(spec) : _json({ error: "Not found" }, 404);
      if (url.pathname === "/api/notes" && url.searchParams.get("q") === "many") {
        return _json({ notes: MANY_NOTES, total: MANY_NOTES.length });
      }
      if (url.pathname === "/api/search") {
        return _json({ results: [{ uuid: "u-1", slug: "milk", id: "milk", title: "Milk" }], total: 1 });
      }
      if (url.pathname === "/api/tasks") return _json({ tasks: MANY_NOTES });
      if (url.pathname === "/api/tasks/bad/statuses") return _json({ error: "Status id is required" }, 400);
      if (url.pathname.endsWith("/check")) return _json({ error: "Item index out of range" }, 400);
      if (url.pathname === "/api/relations/links") return _json({ error: "Mention not found" }, 400);
      if (url.pathname === "/api/notes") return _json(request.method === "GET" ? { notes: [NOTE] } : { success: true, data: NOTE });
      if (url.pathname.startsWith("/api/kanban/")) {
        return _json({ success: true, data: { uuid: "b-1", items: [CARD, { ...CARD, id: "c-2" }] }, item: CARD });
      }
      if (url.pathname === "/api/notes/n-1") return _json({ success: true, data: NOTE });
      if (url.pathname.startsWith("/api/notes/")) return _json({ error: "Note not found" }, 404);
      return _json({ success: true });
    },
  });
  return { url: `http://127.0.0.1:${server.port}`, hits, stop: () => server.stop(true) };
};

export const makeConfig = (url: string, overrides: Partial<McpConfig["jotty"]> = {}): McpConfig => ({
  ...DEFAULT_CONFIG,
  output: { ...DEFAULT_CONFIG.output },
  jotty: { ...DEFAULT_CONFIG.jotty, url, apiKey: API_KEY, ...overrides },
});

export const makeCtx = (url: string, apiKey = API_KEY): ToolContext => {
  const config = makeConfig(url, { apiKey });
  return { config, client: createClient(config.jotty), specs: createSpecSource(60_000), startedAt: Date.now() };
};

export const structured = (result: ToolResult) => result.structuredContent ?? {};

export const text = (result: ToolResult) => result.content.map((part) => part.text).join("\n");
