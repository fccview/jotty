import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

import { JottyClient } from "./client.js";
import { registerAllTools } from "./tools/index.js";

export interface HttpServerOptions {
  /** Base URL of the Jotty REST API the server will proxy to. */
  jottyUrl: string;
  /** Bind host (default 0.0.0.0). */
  host?: string;
  /** Bind port (default 3001). */
  port?: number;
  /** Optional request timeout forwarded to each per-session JottyClient. */
  timeoutMs?: number;
  /**
   * Optional shared secret protecting the MCP endpoint. When set, clients must
   * send `Authorization: Bearer <token>`. When unset the endpoint is open —
   * rely on network restrictions (localhost / Tailscale / reverse proxy).
   */
  mcpToken?: string;
  /**
   * Optional fallback Jotty API key used when a client connects without an
   * `x-api-key` header. Lets you run a single-tenant server where the key is
   * configured server-side instead of per-client.
   */
  fallbackApiKey?: string;
}

/** Header the client sends to supply its Jotty API key (ck_…). */
const JOTTY_API_KEY_HEADER = "x-api-key";

/** Read the raw request body as a string. Empty bodies (GET/DELETE) resolve to "". */
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function getHeader(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Build a fresh per-session transport bound to a fresh McpServer + JottyClient
 * carrying this client's API key. Returns the transport once `server.connect`
 * has wired everything together (sessionId is populated after the initialize
 * request is handled by the caller).
 */
async function createSession(
  req: IncomingMessage,
  options: Required<Pick<HttpServerOptions, "jottyUrl" | "timeoutMs">> &
    Pick<HttpServerOptions, "fallbackApiKey">,
): Promise<StreamableHTTPServerTransport> {
  const apiKey = getHeader(req, JOTTY_API_KEY_HEADER) || options.fallbackApiKey;
  if (!apiKey) {
    throw new Error(
      `Missing Jotty API key. Send it as the "${JOTTY_API_KEY_HEADER}" header (value starts with ck_).`,
    );
  }

  const client = new JottyClient({
    baseUrl: options.jottyUrl,
    apiKey,
    timeoutMs: options.timeoutMs,
  });
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });
  const server = new McpServer({ name: "jotty", version: "1.0.0" });
  registerAllTools(server, client);

  await server.connect(transport);
  return transport;
}

/**
 * Start the Streamable HTTP MCP server. Each connecting client is given its
 * own `McpServer` + `JottyClient` so per-client API keys and timeouts stay
 * isolated. Session state is kept in memory.
 */
export async function startHttpServer(options: HttpServerOptions): Promise<void> {
  const {
    jottyUrl,
    host = "0.0.0.0",
    port = 3001,
    timeoutMs = 30000,
    mcpToken,
    fallbackApiKey,
  } = options;

  const transports = new Map<string, StreamableHTTPServerTransport>();

  const authenticate = (req: IncomingMessage): boolean => {
    if (!mcpToken) return true;
    const auth = getHeader(req, "authorization") || "";
    return auth === `Bearer ${mcpToken}`;
  };

  const httpServer = createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      const path = (req.url || "/").split("?")[0];
      if (path !== "/mcp") {
        res.writeHead(404, { "content-type": "text/plain" });
        res.end("Not found. Use POST /mcp.");
        return;
      }

      if (!authenticate(req)) {
        res.writeHead(401, { "content-type": "text/plain" });
        res.end("Unauthorized.");
        return;
      }

      try {
        if (req.method === "POST") {
          const body = await readBody(req);
          let parsed: unknown;
          try {
            parsed = body ? JSON.parse(body) : undefined;
          } catch {
            res.writeHead(400, { "content-type": "text/plain" });
            res.end("Invalid JSON body.");
            return;
          }

          const sessionId = getHeader(req, "mcp-session-id");
          if (sessionId) {
            // Existing session: hand the message to its transport.
            const transport = transports.get(sessionId);
            if (!transport) {
              res.writeHead(404, { "content-type": "text/plain" });
              res.end("Session not found.");
              return;
            }
            await transport.handleRequest(req, res, parsed);
            return;
          }

          // No session id -> must be an initialize request starting a new session.
          if (!isInitializeRequest(parsed)) {
            res.writeHead(400, { "content-type": "text/plain" });
            res.end("Missing mcp-session-id; initialize first.");
            return;
          }

          let transport: StreamableHTTPServerTransport;
          try {
            transport = await createSession(req, { jottyUrl, timeoutMs, fallbackApiKey });
          } catch (err) {
            res.writeHead(401, { "content-type": "text/plain" });
            res.end(err instanceof Error ? err.message : String(err));
            return;
          }
          await transport.handleRequest(req, res, parsed);
          if (transport.sessionId) {
            transports.set(transport.sessionId, transport);
          }
          return;
        }

        if (req.method === "GET" || req.method === "DELETE") {
          const sessionId = getHeader(req, "mcp-session-id");
          if (!sessionId) {
            res.writeHead(400, { "content-type": "text/plain" });
            res.end("Missing mcp-session-id.");
            return;
          }
          const transport = transports.get(sessionId);
          if (!transport) {
            res.writeHead(404, { "content-type": "text/plain" });
            res.end("Session not found.");
            return;
          }
          await transport.handleRequest(req, res);
          return;
        }

        res.writeHead(405, { allow: "GET, POST, DELETE", "content-type": "text/plain" });
        res.end("Method not allowed.");
      } catch (err) {
        console.error("[jotty-mcp] error handling request:", err);
        if (!res.headersSent) {
          res.writeHead(500, { "content-type": "text/plain" });
          res.end("Internal server error.");
        }
      }
    },
  );

  return new Promise<void>((resolve, reject) => {
    httpServer.on("error", reject);
    httpServer.listen(port, host, () => {
      console.error(`[jotty-mcp] Streamable HTTP server listening on http://${host}:${port}/mcp`);
      console.error(`[jotty-mcp] proxying to Jotty at ${jottyUrl}`);
      if (mcpToken) {
        console.error("[jotty-mcp] endpoint protected by MCP_TOKEN (Bearer auth)");
      } else {
        console.error("[jotty-mcp] WARNING: no MCP_TOKEN set — endpoint is open; restrict network access");
      }
      if (fallbackApiKey) {
        console.error("[jotty-mcp] using server-side fallback API key when client omits x-api-key");
      }
      resolve();
    });
  });
}