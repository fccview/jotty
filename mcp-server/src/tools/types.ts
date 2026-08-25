import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { JottyClient } from "../client.js";

/**
 * Every tool group exports one of these. `register` is called once at startup
 * with the shared server + REST client, and wires up that group's tools.
 */
export interface ToolModule {
  register(server: McpServer, client: JottyClient): void;
}