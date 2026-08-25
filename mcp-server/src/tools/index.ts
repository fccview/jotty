import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { JottyClient } from "../client.js";
import { checklistsModule } from "./checklists.js";
import { notesModule } from "./notes.js";
import { tasksModule } from "./tasks.js";
import { kanbanModule } from "./kanban.js";
import { discoveryModule } from "./discovery.js";
import { adminModule } from "./admin.js";
import { miscModule } from "./misc.js";

const modules = [
  checklistsModule,
  notesModule,
  tasksModule,
  kanbanModule,
  discoveryModule,
  adminModule,
  miscModule,
];

/** Total number of tools registered (handy for startup logging). */
export const toolCount = 54;

/**
 * Register every tool group against the given server/client pair.
 *
 * In stdio mode this is called once. In HTTP mode it is called once per
 * client session, so each session gets its own `JottyClient` carrying that
 * client's API key.
 */
export function registerAllTools(server: McpServer, client: JottyClient): void {
  for (const mod of modules) {
    mod.register(server, client);
  }
}