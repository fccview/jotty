import type { McpConfig } from "../config/schema.ts";
import type { JottyClient } from "../jotty/client.ts";
import type { SpecSource } from "../jotty/spec.ts";

export interface ToolContext {
  config: McpConfig;
  client: JottyClient;
  specs: SpecSource;
  startedAt: number;
}

export enum BuiltinTool {
  Discover = "discover",
  CallOperation = "call_operation",
  Health = "health",
}
