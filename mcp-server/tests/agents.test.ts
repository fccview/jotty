import { afterAll, describe, expect, it } from "bun:test";
import { toSpec } from "../src/jotty/spec.ts";
import { runBuiltin } from "../src/tools/builtins.ts";
import { CURATED_OPERATIONS, toolNameOf } from "../src/tools/catalog.ts";
import { BuiltinTool } from "../src/tools/context.ts";
import { operationTool, runOperation } from "../src/tools/operation.ts";
import {
  BAD_AGENT,
  UNLISTED_WARNING,
  BARE_BOARD_ID,
  BOARD_ID,
  CARD_ID,
  GHOST_BOT,
  PARSER_BOT,
  REFUSALS,
  SECRET_NOTE_ID,
  SPEC_NOTE_ID,
  TASK_CONTEXT,
  TASK_TOTAL,
} from "./agent-fakes.ts";
import { FAKE_SPEC, makeCtx, serveJotty, structured, text } from "./helpers.ts";

const jotty = serveJotty();
const spec = toSpec(FAKE_SPEC);
const op = (id: string) => spec.operations.get(id)!;
const run = (id: string, args: Record<string, unknown>, maxChars?: number) => {
  const ctx = makeCtx(jotty.url);
  if (maxChars) ctx.config.output.maxTextChars = maxChars;
  return runOperation(ctx, spec, op(id), args, { curated: true });
};

const AGENT_OPS = ["assignAgent", "setBoardSpec", "getTaskContext", "listAgentTasks"];
const RUNNERS = /^(run|execute|schedule|spawn|start|stop|retry|restart|kill|heartbeat)/i;

afterAll(() => jotty.stop());

describe("agent tools", () => {
  it("are curated under their snake case names", () => {
    expect(AGENT_OPS.every((id) => CURATED_OPERATIONS.includes(id))).toBe(true);
    expect(AGENT_OPS.map(toolNameOf)).toEqual(["assign_agent", "set_board_spec", "get_task_context", "list_agent_tasks"]);
  });

  it("mark the reads read only and the writes as safe to repeat", () => {
    const hints = (id: string) => operationTool(spec, op(id), 12_000).annotations;
    expect(hints("getTaskContext")).toMatchObject({ readOnlyHint: true, destructiveHint: false });
    expect(hints("listAgentTasks")).toMatchObject({ readOnlyHint: true, destructiveHint: false });
    expect(hints("assignAgent")).toMatchObject({ readOnlyHint: false, destructiveHint: false, idempotentHint: true });
    expect(hints("setBoardSpec")).toMatchObject({ readOnlyHint: false, destructiveHint: false, idempotentHint: true });
  });

  it("show the page size list_agent_tasks uses when left out", () => {
    const tool = operationTool(spec, op("listAgentTasks"), 12_000);
    expect(tool.inputSchema.properties?.limit).toMatchObject({ default: 25 });
  });

  it("stay out of the operations discover lists", async () => {
    const data = structured(await runBuiltin(makeCtx(jotty.url), BuiltinTool.Discover, {}));
    const ids = (data.operations as { operationId: string }[]).map((entry) => entry.operationId);
    expect(data.tools).toEqual(expect.arrayContaining(AGENT_OPS.map(toolNameOf)));
    expect(ids.filter((id) => AGENT_OPS.includes(id))).toEqual([]);
  });

  it("curate nothing that runs, schedules or supervises a worker", () => {
    expect(CURATED_OPERATIONS.filter((id) => RUNNERS.test(id))).toEqual([]);
  });
});

describe("assign_agent", () => {
  it("puts the agent in the body and returns only the changed card", async () => {
    const result = await run("assignAgent", { boardId: BOARD_ID, itemId: CARD_ID, agent: PARSER_BOT });
    expect(jotty.hits.at(-1)).toMatchObject({ method: "PUT", path: `/api/kanban/${BOARD_ID}/items/${CARD_ID}/agent`, body: { agent: PARSER_BOT } });
    expect(structured(result)).toEqual({ success: true, item: expect.objectContaining({ id: CARD_ID, agent: PARSER_BOT, assignee: "alice" }) });
  });

  it.each([[""], [null]])("clears the agent with %j", async (agent) => {
    const result = await run("assignAgent", { boardId: BOARD_ID, itemId: CARD_ID, agent });
    expect(jotty.hits.at(-1)?.body).toEqual({ agent });
    expect((structured(result).item as Record<string, unknown>).agent).toBeUndefined();
  });

  it("can't touch the human assignee", async () => {
    const before = jotty.hits.length;
    const result = await run("assignAgent", { boardId: BOARD_ID, itemId: CARD_ID, assignee: "bob" });
    expect(structured(result).error).toMatchObject({ kind: "input", message: "Unknown argument assignee." });
    expect(jotty.hits.length).toBe(before);
  });

  it("assigns an agent the spec doesn't list and passes the warning on", async () => {
    const result = await run("assignAgent", { boardId: BARE_BOARD_ID, itemId: CARD_ID, agent: GHOST_BOT });
    expect(structured(result)).toEqual({
      success: true,
      item: expect.objectContaining({ agent: GHOST_BOT }),
      warning: UNLISTED_WARNING,
    });
  });

  it("leaves the card's history and bookkeeping out of the reply", async () => {
    const result = await run("assignAgent", { boardId: BOARD_ID, itemId: CARD_ID, agent: PARSER_BOT });
    const item = structured(result).item as Record<string, unknown>;
    expect(Object.keys(item).sort()).toEqual(["agent", "assignee", "completed", "id", "status", "text"]);
  });

  it("explains the id rules when an id is refused", async () => {
    const result = await run("assignAgent", { boardId: BOARD_ID, itemId: CARD_ID, agent: BAD_AGENT });
    expect(structured(result).error).toMatchObject({ kind: "input", status: 400, message: REFUSALS.invalidAgent });
    expect(text(result)).toContain("no spaces");
    expect(text(result)).toContain("Agents section");
  });
});

describe("set_board_spec", () => {
  it("pins a note and returns the agents its spec lists", async () => {
    const result = await run("setBoardSpec", { boardId: BOARD_ID, noteId: SPEC_NOTE_ID });
    expect(jotty.hits.at(-1)).toMatchObject({ method: "PUT", path: `/api/kanban/${BOARD_ID}/spec`, body: { noteId: SPEC_NOTE_ID } });
    expect(structured(result)).toMatchObject({ data: { specNote: SPEC_NOTE_ID, status: "linked", agents: [{ id: PARSER_BOT }] } });
  });

  it("unpins with a null noteId", async () => {
    const result = await run("setBoardSpec", { boardId: BOARD_ID, noteId: null });
    expect(jotty.hits.at(-1)?.body).toEqual({ noteId: null });
    expect(structured(result)).toMatchObject({ data: { specNote: null, status: "none", agents: [] } });
  });

  it("explains why an encrypted note is refused", async () => {
    const result = await run("setBoardSpec", { boardId: BOARD_ID, noteId: SECRET_NOTE_ID });
    expect(text(result)).toContain(REFUSALS.encrypted);
    expect(text(result)).toContain("isn't encrypted");
  });
});

describe("get_task_context", () => {
  it("reads the card context by board and card id", async () => {
    const result = await run("getTaskContext", { boardId: BOARD_ID, itemId: CARD_ID });
    expect(jotty.hits.at(-1)).toMatchObject({ method: "GET", path: `/api/kanban/${BOARD_ID}/items/${CARD_ID}/context`, body: undefined });
    expect(structured(result)).toEqual({ success: true, data: TASK_CONTEXT });
  });

  it("sends an unknown card to get_board", async () => {
    const result = await run("getTaskContext", { boardId: BOARD_ID, itemId: "c-gone" });
    expect(structured(result).error).toMatchObject({ kind: "not_found", status: 404 });
    expect(text(result)).toContain("get_board");
  });

  it("stays within the character budget", async () => {
    const result = await run("getTaskContext", { boardId: BOARD_ID, itemId: CARD_ID }, 400);
    expect(text(result)).toContain("cut at 400");
    expect(text(result)).toContain("maxChars");
  });
});

describe("list_agent_tasks", () => {
  it("asks for 25 tasks unless told otherwise", async () => {
    const result = await run("listAgentTasks", {});
    expect(jotty.hits.at(-1)?.path).toBe("/api/agents/tasks?limit=25");
    expect((structured(result).tasks as unknown[]).length).toBe(25);
    expect(structured(result).total).toBe(TASK_TOTAL);
  });

  it("passes the filters as query parameters", async () => {
    await run("listAgentTasks", { agent: PARSER_BOT, boardId: BOARD_ID, status: "todo,in_progress", includeCompleted: true, limit: 5 });
    const url = new URL(`http://x${jotty.hits.at(-1)?.path}`);
    expect(url.pathname).toBe("/api/agents/tasks");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      agent: PARSER_BOT,
      boardId: BOARD_ID,
      status: "todo,in_progress",
      includeCompleted: "true",
      limit: "5",
    });
    expect(jotty.hits.at(-1)?.body).toBeUndefined();
  });

  it("trims a long list and says which offset reads on", async () => {
    const result = await run("listAgentTasks", { agent: PARSER_BOT, offset: 25, limit: 15 }, 1_000);
    const data = structured(result);
    const trimmed = data.trimmed as { field: string; shown: number; of: number; hint: string };
    expect(text(result).length).toBeLessThanOrEqual(1_000);
    expect(trimmed).toMatchObject({ field: "tasks", of: 15 });
    expect(trimmed.hint).toContain(`offset=${25 + trimmed.shown}`);
    expect(data.total).toBe(TASK_TOTAL);
  });
});
