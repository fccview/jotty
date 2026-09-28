export enum Transport {
  Stdio = "stdio",
  Http = "http",
}

export interface JottyConfig {
  url: string;
  apiKey: string;
  timeoutMs: number;
}

export interface ServerConfig {
  transport: Transport;
  port: number;
  host: string;
  authToken: string;
}

export interface OutputConfig {
  maxTextChars: number;
}

export interface McpConfig {
  jotty: JottyConfig;
  server: ServerConfig;
  output: OutputConfig;
  specTtlMs: number;
}
