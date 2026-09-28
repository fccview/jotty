import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../utils/logger.ts";

const LOG_NS = "sessions";

export const SESSION_HEADER = "mcp-session-id";
export const SESSION_IDLE_MS = 30 * 60 * 1000;

enum RpcCode {
  ParseError = -32700,
  BadRequest = -32000,
  NotFound = -32001,
}

enum RpcMessage {
  BadJson = "Parse error: Invalid JSON",
  NeedSession = "Bad Request: Mcp-Session-Id header is required",
  NoSession = "Session not found",
}

interface Session {
  server: Server;
  transport: WebStandardStreamableHTTPServerTransport;
  touchedAt: number;
}

export interface SessionPool {
  handle: (request: Request) => Promise<Response>;
  size: () => number;
  close: () => Promise<void>;
}

const PARSE_FAILED = Symbol("parse-failed");

const rpcFail = (status: number, code: RpcCode, message: RpcMessage): Response =>
  Response.json({ jsonrpc: "2.0", error: { code, message }, id: null }, { status });

const readBody = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    return PARSE_FAILED;
  }
};

const isHandshake = (body: unknown): boolean =>
  Array.isArray(body) ? body.some(isInitializeRequest) : isInitializeRequest(body);

export const createSessionPool = (forge: (request: Request) => Server): SessionPool => {
  const sessions = new Map<string, Session>();

  const dropStale = async (): Promise<void> => {
    const cutoff = Date.now() - SESSION_IDLE_MS;
    for (const [id, session] of [...sessions]) {
      if (session.touchedAt > cutoff) continue;
      sessions.delete(id);
      logger.debug(LOG_NS, `session expired ${id.slice(0, 8)}`);
      await session.server.close();
    }
  };

  const open = async (request: Request, body: unknown): Promise<Response> => {
    await dropStale();
    const server = forge(request);
    const session: Session = {
      server,
      touchedAt: Date.now(),
      transport: new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (id) => {
          sessions.set(id, session);
          logger.debug(LOG_NS, `session opened ${id.slice(0, 8)}`);
        },
        onsessionclosed: (id) => {
          sessions.delete(id);
          logger.debug(LOG_NS, `session closed ${id.slice(0, 8)}`);
        },
      }),
    };
    await server.connect(session.transport);
    const response = await session.transport.handleRequest(request, { parsedBody: body });
    if (!session.transport.sessionId) await server.close();
    return response;
  };

  const handle = async (request: Request): Promise<Response> => {
    const id = request.headers.get(SESSION_HEADER);
    if (id) {
      const session = sessions.get(id);
      if (!session) return rpcFail(404, RpcCode.NotFound, RpcMessage.NoSession);
      session.touchedAt = Date.now();
      return session.transport.handleRequest(request);
    }
    if (request.method !== "POST") return rpcFail(400, RpcCode.BadRequest, RpcMessage.NeedSession);
    const body = await readBody(request);
    if (body === PARSE_FAILED) return rpcFail(400, RpcCode.ParseError, RpcMessage.BadJson);
    if (!isHandshake(body)) return rpcFail(400, RpcCode.BadRequest, RpcMessage.NeedSession);
    return open(request, body);
  };

  return {
    handle,
    size: () => sessions.size,
    close: async () => {
      const live = [...sessions.values()];
      sessions.clear();
      await Promise.all(live.map((session) => session.server.close()));
    },
  };
};
