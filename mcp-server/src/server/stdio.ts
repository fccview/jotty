import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { ToolContext } from "../tools/context.ts";
import { logger } from "../utils/logger.ts";
import { createMcpServer } from "./mcp.ts";

const LOG_NS = "stdio";

export const startStdio = async (ctx: ToolContext) => {
  if (!ctx.client.hasApiKey) logger.warn(LOG_NS, "JOTTY_API_KEY is empty, every call except health will be refused");
  const server = createMcpServer(ctx);
  await server.connect(new StdioServerTransport());
  logger.info(LOG_NS, `serving ${ctx.client.baseUrl} over stdio`);
  return { stop: () => server.close() };
};
