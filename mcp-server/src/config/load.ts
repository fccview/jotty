import { EnvVar, readEnv } from "./env.ts";
import { Transport, type McpConfig } from "./schema.ts";

export const DEFAULT_CONFIG: McpConfig = {
  jotty: { url: "http://localhost:3000", apiKey: "", timeoutMs: 30_000 },
  server: { transport: Transport.Stdio, port: 3001, host: "", authToken: "" },
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

export const loadConfig = (): McpConfig => ({
  jotty: {
    url: trimSlash(readEnv(EnvVar.JottyUrl) || DEFAULT_CONFIG.jotty.url),
    apiKey: readEnv(EnvVar.ApiKey),
    timeoutMs: positive(readEnv(EnvVar.TimeoutMs), DEFAULT_CONFIG.jotty.timeoutMs),
  },
  server: {
    transport: asTransport(readEnv(EnvVar.Transport)),
    port: positive(readEnv(EnvVar.Port), DEFAULT_CONFIG.server.port),
    host: readEnv(EnvVar.BindHost),
    authToken: readEnv(EnvVar.AuthToken),
  },
  output: {
    maxTextChars: positive(readEnv(EnvVar.MaxTextChars), DEFAULT_CONFIG.output.maxTextChars),
  },
  specTtlMs: positive(readEnv(EnvVar.SpecTtlMs), DEFAULT_CONFIG.specTtlMs),
});
