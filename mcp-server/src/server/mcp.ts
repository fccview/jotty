import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { registerTools } from "../tools/register.ts";
import type { ToolContext } from "../tools/context.ts";

export const SERVER_NAME = "jotty-mcp";
export const SERVER_VERSION = "0.1.0";

export const SERVER_INSTRUCTIONS = [
  "Tools for a Jotty instance: notes, checklists and Kanban boards, acting as the user who owns the API key.",
  "Ids are uuids, so list or search first to get one. Checklist items are addressed by tree index, like 0 or 2.1.",
  "Search ranks the best matches first and finds the words in any order.",
  "Notes link to each other. After finding an item, get_related lists what links to it and what it links to, so you can follow the links and read only what matters. get_brain maps the items around one, or the most linked ones.",
  "When you write a note about another item, link it with connect_items so it doesn't end up an orphan.",
  "The dedicated tools cover search, links, shares, notes, checklists and boards. Use discover and call_operation for everything else the instance offers.",
].join(" ");

export const createMcpServer = (ctx: ToolContext): Server => {
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} }, instructions: SERVER_INSTRUCTIONS },
  );
  registerTools(server, ctx);
  return server;
};
