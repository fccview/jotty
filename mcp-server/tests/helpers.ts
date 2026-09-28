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

export const FAKE_SPEC: OpenApiDocument = {
  info: { title: "Jotty API", version: "9.9.9" },
  paths: {
    "/notes": {
      get: {
        operationId: "listNotes",
        summary: "List notes",
        tags: ["Notes"],
        parameters: [{ name: "q", in: "query" as never, required: false, schema: { type: "string" } }],
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

export const serveJotty = (spec: OpenApiDocument = FAKE_SPEC): FakeJotty => {
  const hits: Hit[] = [];
  const server = Bun.serve({
    port: 0,
    fetch: async (request) => {
      const url = new URL(request.url);
      const apiKey = request.headers.get("x-api-key");
      const text = request.method === "GET" ? "" : await request.text();
      hits.push({ method: request.method, path: `${url.pathname}${url.search}`, apiKey, body: text ? JSON.parse(text) : undefined });

      if (url.pathname === "/api/health") return _json({ status: "healthy", version: spec.info.version });
      if (apiKey !== API_KEY) return _json({ error: "Unauthorized" }, 401);
      if (url.pathname === "/api/openapi.json") return _json(spec);
      if (url.pathname === "/api/notes") return _json(request.method === "GET" ? { notes: [NOTE] } : { success: true, data: NOTE });
      if (url.pathname === "/api/notes/n-1") return _json({ success: true, data: NOTE });
      if (url.pathname.startsWith("/api/notes/")) return _json({ error: "Note not found" }, 404);
      return _json({ success: true });
    },
  });
  return { url: `http://127.0.0.1:${server.port}`, hits, stop: () => server.stop(true) };
};

export const makeConfig = (url: string, overrides: Partial<McpConfig["jotty"]> = {}): McpConfig => ({
  ...DEFAULT_CONFIG,
  jotty: { ...DEFAULT_CONFIG.jotty, url, apiKey: API_KEY, ...overrides },
});

export const makeCtx = (url: string, apiKey = API_KEY): ToolContext => {
  const config = makeConfig(url, { apiKey });
  return { config, client: createClient(config.jotty), specs: createSpecSource(60_000), startedAt: Date.now() };
};

export const structured = (result: ToolResult) => result.structuredContent ?? {};

export const text = (result: ToolResult) => result.content.map((part) => part.text).join("\n");
