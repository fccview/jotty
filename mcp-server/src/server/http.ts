import type { McpConfig } from "../config/schema.ts";
import { createClient } from "../jotty/client.ts";
import type { ToolContext } from "../tools/context.ts";
import { logger } from "../utils/logger.ts";
import { API_KEY_HEADER, createGuard, deniedResponse } from "./auth.ts";
import { createOriginCheck, exposureRefusal } from "./exposure.ts";
import { createMcpServer, SERVER_NAME, SERVER_VERSION } from "./mcp.ts";
import { createSessionPool, type SessionPool } from "./sessions.ts";

const LOG_NS = "http";
const BUN_MAX_IDLE_SECONDS = 255;
const MAX_BODY_BYTES = 10 * 1024 * 1024;

export enum HttpPath {
  Mcp = "/mcp",
  Health = "/health",
  Healthz = "/healthz",
}

export interface Sidecar {
  fetch: (request: Request) => Promise<Response>;
  pool: SessionPool;
  close: () => Promise<void>;
}

export const createSidecar = (ctx: ToolContext): Sidecar => {
  const guard = createGuard(ctx.config.server.authToken);
  const originCheck = createOriginCheck(ctx.config.server);
  const pool = createSessionPool(
    (request) =>
      createMcpServer({
        ...ctx,
        client: createClient(ctx.config.jotty, request.headers.get(API_KEY_HEADER)?.trim() || ctx.config.jotty.apiKey),
      }),
    { allowedHosts: ctx.config.server.allowedHosts, allowedOrigins: ctx.config.server.allowedOrigins },
  );

  if (!guard.required && ctx.config.jotty.apiKey) {
    logger.warn(LOG_NS, "JOTTY_API_KEY is set without JOTTY_MCP_AUTH_TOKEN, anyone who reaches this port acts as that user");
  }

  const fetchRequest = async (request: Request): Promise<Response> => {
    const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
    if (path === HttpPath.Health || path === HttpPath.Healthz) {
      return Response.json({ ok: true, name: SERVER_NAME, version: SERVER_VERSION });
    }
    if (path !== HttpPath.Mcp) return Response.json({ error: "Not found" }, { status: 404 });
    const misdirected = originCheck(request);
    if (misdirected) {
      logger.warn(LOG_NS, `rejected /mcp request: ${misdirected}`);
      return Response.json({ error: misdirected }, { status: 403 });
    }
    if (!guard.allows(request)) {
      logger.warn(LOG_NS, "rejected /mcp request without a valid bearer token");
      return deniedResponse();
    }
    return pool.handle(request);
  };

  return { fetch: fetchRequest, pool, close: () => pool.close() };
};

export const startHttp = (sidecar: Sidecar, config: McpConfig) => {
  const refusal = exposureRefusal(config.server);
  if (refusal) throw new Error(refusal);

  const server = Bun.serve({
    port: config.server.port,
    hostname: config.server.host,
    idleTimeout: BUN_MAX_IDLE_SECONDS,
    maxRequestBodySize: MAX_BODY_BYTES,
    fetch: sidecar.fetch,
  });
  logger.info(LOG_NS, `listening on ${config.server.host}:${server.port}${HttpPath.Mcp}`);
  return {
    port: server.port ?? config.server.port,
    stop: async () => {
      await server.stop(true);
      await sidecar.close();
    },
  };
};
