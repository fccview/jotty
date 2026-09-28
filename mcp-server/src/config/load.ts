import { EnvVar, readEnv } from "./env.ts";
import { Transport, type McpConfig } from "./schema.ts";

export const LOOPBACK_HOST = "127.0.0.1";

export const DEFAULT_CONFIG: McpConfig = {
  jotty: { url: "http://localhost:3000", apiKey: "", timeoutMs: 30_000 },
  server: {
    transport: Transport.Stdio,
    port: 3001,
    host: LOOPBACK_HOST,
    authToken: "",
    allowNoAuth: false,
    allowedHosts: [],
    allowedOrigins: [],
  },
  output: { maxTextChars: 12_000 },
  specTtlMs: 300_000,
};

const positive = (raw: string, fallback: number): number => {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
};

const asTransport = (raw: string): Transport =>
  Object.values(Transport).find((value) => value === raw.toLowerCase()) ??
  DEFAULT_CONFIG.server.transport;

const trimSlash = (url: string): string => url.replace(/\/+$/, "");

const listOf = (raw: string): string[] =>
  raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const truthy = (raw: string): boolean => ["1", "true", "yes"].includes(raw.toLowerCase());

export const loadConfig = (): McpConfig => ({
  jotty: {
    url: trimSlash(readEnv(EnvVar.JottyUrl) || DEFAULT_CONFIG.jotty.url),
    apiKey: readEnv(EnvVar.ApiKey),
    timeoutMs: positive(readEnv(EnvVar.TimeoutMs), DEFAULT_CONFIG.jotty.timeoutMs),
  },
  server: {
    transport: asTransport(readEnv(EnvVar.Transport)),
    port: positive(readEnv(EnvVar.Port), DEFAULT_CONFIG.server.port),
    host: readEnv(EnvVar.BindHost) || DEFAULT_CONFIG.server.host,
    authToken: readEnv(EnvVar.AuthToken),
    allowNoAuth: truthy(readEnv(EnvVar.AllowNoAuth)),
    allowedHosts: listOf(readEnv(EnvVar.AllowedHosts)),
    allowedOrigins: listOf(readEnv(EnvVar.AllowedOrigins)),
  },
  output: {
    maxTextChars: positive(readEnv(EnvVar.MaxTextChars), DEFAULT_CONFIG.output.maxTextChars),
  },
  specTtlMs: positive(readEnv(EnvVar.SpecTtlMs), DEFAULT_CONFIG.specTtlMs),
});
