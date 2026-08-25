/*
 * Real integration test for the HTTP (Streamable HTTP) transport. Uses the MCP
 * SDK's own Client against the running jotty-mcp http server, which in turn
 * proxies to a running Jotty instance. Validates the full
 *   Cursor-like client -> MCP http server -> Jotty REST API
 * path over the network.
 *
 * Env: MCP_URL (http endpoint), JOTTY_API_KEY (ck_… sent as x-api-key header).
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const mcpUrl = process.env.MCP_URL || "http://127.0.0.1:3001/mcp";
const apiKey = process.env.JOTTY_API_KEY;

let ok = true;
const check = (cond, msg) => {
  if (!cond) {
    ok = false;
    console.error("  FAIL:", msg);
  } else {
    console.log("  ok:", msg);
  }
};

const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
  requestInit: {
    headers: { "x-api-key": apiKey },
  },
});
const client = new Client({ name: "http-integration-test", version: "0.0.1" });

try {
  await client.connect(transport);
  check(true, "client connected to MCP http server");

  const tools = await client.listTools();
  check(tools.tools.length >= 40, `listTools returned ${tools.tools.length} tools`);
  check(
    tools.tools.some((t) => t.name === "list_checklists"),
    "tool list includes list_checklists",
  );

  // health (public)
  const health = await client.callTool({ name: "health", arguments: {} });
  const healthData = JSON.parse(health.content[0].text);
  check(healthData.status === "healthy", `health => ${healthData.status} v${healthData.version}`);
  check(health.isError !== true, "health is not an error");

  // list_checklists (authenticated, proxied to Jotty)
  const lists = await client.callTool({ name: "list_checklists", arguments: {} });
  const listsData = JSON.parse(lists.content[0].text);
  check(Array.isArray(listsData.checklists), `list_checklists => ${listsData.checklists?.length} lists`);

  // get_summary
  const summary = await client.callTool({ name: "get_summary", arguments: {} });
  const summaryData = JSON.parse(summary.content[0].text);
  check(typeof summaryData.summary.checklists.total === "number", "get_summary returns numbers");

  // create + delete round-trip over HTTP
  const created = await client.callTool({
    name: "create_checklist",
    arguments: { title: "HTTP MCP Test", category: "MCP-HTTP", type: "simple" },
  });
  const createdData = JSON.parse(created.content[0].text);
  const newId = createdData.data?.id;
  check(!!newId, `create_checklist => id ${newId}`);
  if (newId) {
    const del = await client.callTool({ name: "delete_checklist", arguments: { listId: newId } });
    check(del.content[0].text.includes("true"), "delete_checklist ok");
  }

  // error path: bad uuid
  const bad = await client.callTool({ name: "get_note", arguments: { noteId: "not-real-uuid-9999" } });
  check(bad.isError === true, "get_note bad uuid => isError");

  console.log(ok ? "\nHTTP INTEGRATION TEST PASSED" : "\nHTTP INTEGRATION TEST FAILED");
  process.exit(ok ? 0 : 1);
} catch (err) {
  console.error("test crashed:", err);
  process.exit(1);
} finally {
  await transport.close();
}