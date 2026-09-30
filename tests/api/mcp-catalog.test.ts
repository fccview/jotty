import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { ROUTE_MODULES } from "@/app/_server/api/route-index";
import { contractsOf } from "@/app/_server/api/openapi";

const CATALOG_FILE = path.join(process.cwd(), "mcp-server", "src", "tools", "catalog.ts");
const CATALOG_ID = /\{\s*id:\s*"([A-Za-z]+)"/g;

const AGENT_TOOLS = [
  { id: "assignAgent", tool: "assign_agent", method: "put", path: "/kanban/{boardId}/items/{itemId}/agent" },
  { id: "getTaskContext", tool: "get_task_context", method: "get", path: "/kanban/{boardId}/items/{itemId}/context" },
  { id: "listAgentTasks", tool: "list_agent_tasks", method: "get", path: "/agents/tasks" },
  { id: "setBoardSpec", tool: "set_board_spec", method: "put", path: "/kanban/{boardId}/spec" },
];

const catalogIds = (): string[] =>
  Array.from(fs.readFileSync(CATALOG_FILE, "utf8").matchAll(CATALOG_ID), (match) => match[1]);

const toolName = (operationId: string): string =>
  operationId.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();

const contracts = contractsOf(ROUTE_MODULES);

describe("MCP catalog against the app's route contracts", () => {
  it("only curates operations the app actually serves", () => {
    const served = new Set(contracts.map((contract) => contract.id));
    const missing = catalogIds().filter((id) => !served.has(id));
    expect(missing).toEqual([]);
  });

  it.each(AGENT_TOOLS)("exposes $tool from $method $path", ({ id, tool, method, path: route }) => {
    expect(catalogIds()).toContain(id);
    expect(toolName(id)).toBe(tool);
    const contract = contracts.find((candidate) => candidate.id === id);
    expect(contract?.path).toBe(route);
    expect(contract?.method.toLowerCase()).toBe(method);
  });

  it("curates no execution or scheduling operation", () => {
    const runners = catalogIds().filter((id) => /^(run|execute|schedule|spawn|start|stop|retry)/i.test(id));
    expect(runners).toEqual([]);
  });
});
