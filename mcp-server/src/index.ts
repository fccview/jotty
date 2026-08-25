import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { JottyClient } from "./client.js";
import { registerAllTools } from "./tools/index.js";
import { startHttpServer } from "./http.js";

/**
 * Configuration is read from the environment.
 *
 * Required (both transports):
 *   JOTTY_URL       — base URL of the Jotty REST API the server proxies to
 *                     (stdio: your remote instance; http: usually http://localhost:3000)
 *   JOTTY_API_KEY   — Jotty API key (ck_…). Used directly in stdio mode; in http
 *                     mode it is only a fallback for clients that omit x-api-key.
 *
 * Transport selection:
 *   MCP_TRANSPORT   — "stdio" (default) | "http"
 *
 * HTTP mode only:
 *   MCP_HOST        — bind host (default 0.0.0.0)
 *   MCP_PORT        — bind port (default 3001)
 *   MCP_TOKEN       — optional shared secret; clients must send Authorization: Bearer <token>
 *
 * Optional (both):
 *   JOTTY_TIMEOUT_MS — per-request timeout in ms (default 30000)
 */
function envOrThrow(name: string, message: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(message);
  }
  return value;
}

function timeoutFromEnv(): number {
  const n = Number.parseInt(process.env.JOTTY_TIMEOUT_MS ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 30000;
}

/** stdio: a single client (the launching AI app) with a single server/client pair. */
async function runStdio(): Promise<void> {
  const baseUrl = envOrThrow(
    "JOTTY_URL",
    "JOTTY_URL is required (the base URL of your Jotty instance, e.g. https://jotty.example.com).",
  );
  const apiKey = envOrThrow(
    "JOTTY_API_KEY",
    "JOTTY_API_KEY is required (generate one in Jotty -> Profile -> Settings -> API Key).",
  );

  const client = new JottyClient({ baseUrl, apiKey, timeoutMs: timeoutFromEnv() });
  const server = new McpServer({ name: "jotty", version: "1.0.0" });
  registerAllTools(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

/** http: a long-lived Streamable HTTP server with one McpServer per client session. */
async function runHttp(): Promise<void> {
  const jottyUrl = envOrThrow(
    "JOTTY_URL",
    "JOTTY_URL is required in http mode (where Jotty's REST API is, e.g. http://localhost:3000).",
  );
  const port = (() => {
    const n = Number.parseInt(process.env.MCP_PORT ?? "", 10);
    return Number.isFinite(n) && n > 0 ? n : 3001;
  })();
  const host = process.env.MCP_HOST?.trim() || "0.0.0.0";

  const fallbackApiKey = process.env.JOTTY_API_KEY?.trim() || undefined;
  const mcpToken = process.env.MCP_TOKEN?.trim() || undefined;

  await startHttpServer({
    jottyUrl,
    host,
    port,
    timeoutMs: timeoutFromEnv(),
    mcpToken,
    fallbackApiKey,
  });
}

async function main(): Promise<void> {
  const transport = (process.env.MCP_TRANSPORT?.trim() || "stdio").toLowerCase();

  if (transport === "http") {
    await runHttp();
    // The HTTP server keeps the process alive listening for requests.
  } else if (transport === "stdio") {
    await runStdio();
    // The stdio transport keeps the process alive reading JSON-RPC from stdin.
  } else {
    throw new Error(`Unknown MCP_TRANSPORT "${transport}" — use "stdio" or "http".`);
  }
}

main().catch((err) => {
  // Configuration/startup errors go to stderr; stdout is reserved for MCP protocol.
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});