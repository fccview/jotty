import type { ServerConfig } from "../config/schema.ts";

export const PLACEHOLDER_TOKEN = "changeme";

const LOOPBACK_NAMES = new Set(["localhost", "::1", "[::1]"]);

export const isLoopback = (host: string): boolean =>
  LOOPBACK_NAMES.has(host.toLowerCase()) || /^127(\.\d{1,3}){3}$/.test(host);

export const weakToken = (token: string): boolean => !token || token === PLACEHOLDER_TOKEN;

export const exposureRefusal = (server: ServerConfig): string | null => {
  if (!weakToken(server.authToken) || isLoopback(server.host) || server.allowNoAuth) return null;

  return [
    `Refusing to serve /mcp on ${server.host} with ${server.authToken ? "the placeholder" : "no"} JOTTY_MCP_AUTH_TOKEN.`,
    "Set a real token, bind JOTTY_MCP_BIND_HOST to 127.0.0.1,",
    "or set JOTTY_MCP_ALLOW_NO_AUTH=true if the port is only reachable from a network you trust.",
  ].join(" ");
};

const LOOPBACK_ALIASES = ["localhost", "127.0.0.1", "::1"];

const _bare = (host: string): string =>
  host.startsWith("[") ? host.slice(1, host.indexOf("]")) : (host.split(":")[0] ?? "");

export const hostsFor = (server: ServerConfig): string[] => {
  if (server.allowedHosts.length) return server.allowedHosts;
  return isLoopback(server.host) ? LOOPBACK_ALIASES : [];
};

const _hostnameOf = (origin: string): string | null => {
  try {
    return _bare(new URL(origin).host);
  } catch {
    return null;
  }
};

export const createOriginCheck = (server: ServerConfig) => (request: Request): string | null => {
  const hosts = hostsFor(server);
  const host = request.headers.get("host") ?? "";
  if (hosts.length && !hosts.includes(host) && !hosts.includes(_bare(host))) {
    return `Invalid Host header: ${host}`;
  }

  const origin = request.headers.get("origin");
  if (!origin) return null;
  if (server.allowedOrigins.length) {
    return server.allowedOrigins.includes(origin) ? null : `Invalid Origin header: ${origin}`;
  }

  const hostname = _hostnameOf(origin);
  const trusted = hostname !== null && (isLoopback(hostname) || hostname === _bare(host));
  return trusted ? null : `Invalid Origin header: ${origin}`;
};
