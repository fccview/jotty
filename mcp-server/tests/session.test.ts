import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createSidecar, startHttp } from "../src/server/http.ts";
import { createSpecSource } from "../src/jotty/spec.ts";
import { createClient } from "../src/jotty/client.ts";
import { API_KEY, makeConfig, serveJotty } from "./helpers.ts";

const TOKEN = "mcp-secret";
const jotty = serveJotty();
let server: ReturnType<typeof startHttp>;

const connect = async (headers: Record<string, string>) => {
  const client = new Client({ name: "test", version: "0" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${server.port}/mcp`), { requestInit: { headers } }),
  );
  return client;
};

beforeAll(() => {
  const config = makeConfig(jotty.url, { apiKey: "" });
  config.server = { ...config.server, port: 0, authToken: TOKEN };
  server = startHttp(
    createSidecar({ config, client: createClient(config.jotty), specs: createSpecSource(60_000), startedAt: Date.now() }),
    config,
  );
});

afterAll(async () => {
  await server.stop();
  await jotty.stop();
});

describe("http transport", () => {
  it("refuses /mcp without the bearer token", async () => {
    const response = await fetch(`http://127.0.0.1:${server.port}/mcp`, { method: "POST", body: "{}" });
    expect(response.status).toBe(401);
  });

  it("keeps /health open for orchestrators", async () => {
    const response = await fetch(`http://127.0.0.1:${server.port}/health`);
    expect(response.status).toBe(200);
  });

  it("lists spec-driven tools and calls them with the session's own API key", async () => {
    const client = await connect({ authorization: `Bearer ${TOKEN}`, "x-api-key": API_KEY });
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name)).toEqual([
      "search",
      "list_notes",
      "get_note",
      "create_note",
      "delete_note",
      "check_checklist_item",
      "update_board_item",
      "assign_agent",
      "set_board_spec",
      "get_task_context",
      "list_agent_tasks",
      "connect_items",
      "list_duplicate_uuids",
      "discover",
      "call_operation",
      "health",
    ]);
    const result = await client.callTool({ name: "get_note", arguments: { noteId: "n-1" } });
    expect(result.structuredContent).toMatchObject({ success: true, data: { id: "n-1" } });
    expect(jotty.hits.at(-1)?.apiKey).toBe(API_KEY);
    await client.close();
  });

  it("falls back to built-in tools when the session has no working key", async () => {
    const client = await connect({ authorization: `Bearer ${TOKEN}` });
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name)).toEqual(["discover", "call_operation", "health"]);
    await client.close();
  });
});
