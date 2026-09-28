export enum EnvVar {
  JottyUrl = "JOTTY_URL",
  ApiKey = "JOTTY_API_KEY",
  Transport = "JOTTY_MCP_TRANSPORT",
  Port = "JOTTY_MCP_PORT",
  BindHost = "JOTTY_MCP_BIND_HOST",
  AuthToken = "JOTTY_MCP_AUTH_TOKEN",
  TimeoutMs = "JOTTY_MCP_TIMEOUT_MS",
  MaxTextChars = "JOTTY_MCP_MAX_TEXT_CHARS",
  SpecTtlMs = "JOTTY_MCP_SPEC_TTL_MS",
  LogLevel = "JOTTY_MCP_LOG_LEVEL",
}

export const readEnv = (name: EnvVar): string => (process.env[name] ?? "").trim();
