import type { OpenApiDocument } from "../src/jotty/openapi.ts";

export const BOARD_ID = "b-1";
export const BARE_BOARD_ID = "b-bare";
export const SPEC_NOTE_ID = "n-spec";
export const SECRET_NOTE_ID = "n-secret";
export const CARD_ID = "c-1";
export const PARSER_BOT = "parser-bot";
export const GHOST_BOT = "ghost-bot";
export const BAD_AGENT = "bad | agent:x";
export const UNLISTED_WARNING = "ghost-bot isn't in the spec's Agents section";
export const TASK_TOTAL = 40;

export const REFUSALS = {
  invalidAgent: "Agent id must be 1-64 letters, digits, dots, dashes or underscores with no spaces, starting with a letter or digit. Jotty lowercases it",
  encrypted: "Encrypted notes can't be a board spec",
};

type Paths = OpenApiDocument["paths"];

const PATH = "path" as never;
const QUERY = "query" as never;

const boardParam = { name: "boardId", in: PATH, required: true, schema: { type: "string" } };
const cardParams = [boardParam, { name: "itemId", in: PATH, required: true, schema: { type: "string" } }];
const optional = (name: string) => ({ name, in: QUERY, required: false, schema: { type: "string" } });
const bodyOf = (field: string) => ({
  content: { "application/json": { schema: { type: "object", properties: { [field]: { type: ["string", "null"] } } } } },
});

export const AGENT_PATHS: Paths = {
  "/kanban/{boardId}/items/{itemId}/agent": {
    put: { operationId: "assignAgent", summary: "Put an agent on a card", tags: ["Kanban"], parameters: cardParams, requestBody: bodyOf("agent") },
  },
  "/kanban/{boardId}/spec": {
    put: { operationId: "setBoardSpec", summary: "Pin a spec note to a board", tags: ["Kanban"], parameters: [boardParam], requestBody: bodyOf("noteId") },
  },
  "/kanban/{boardId}/items/{itemId}/context": {
    get: { operationId: "getTaskContext", summary: "Get a card with its spec context", tags: ["Kanban"], parameters: cardParams },
  },
  "/agents/tasks": {
    get: {
      operationId: "listAgentTasks",
      summary: "List the cards agents hold",
      tags: ["Kanban"],
      parameters: [
        optional("agent"),
        optional("boardId"),
        optional("status"),
        optional("includeCompleted"),
        { name: "limit", in: QUERY, required: false, schema: { type: "integer" } },
        { name: "offset", in: QUERY, required: false, schema: { type: "integer" } },
      ],
    },
  },
};

const CARD = {
  id: CARD_ID,
  text: "Build parser",
  status: "todo",
  completed: false,
  order: 0,
  assignee: "alice",
  history: [{ status: "todo", timestamp: "2026-01-01T00:00:00.000Z", user: "alice" }],
  timeEntries: [],
};

const TASKS = Array.from({ length: TASK_TOTAL }, (_, n) => ({
  boardId: BOARD_ID,
  boardTitle: "Parser rewrite",
  specNote: SPEC_NOTE_ID,
  itemId: `c-${n}`,
  text: `Task number ${n} with a long enough title to take room`,
  status: "in_progress",
  statusLabel: "In progress",
  completed: false,
  agent: PARSER_BOT,
}));

export const TASK_CONTEXT = {
  board: { id: BOARD_ID, title: "Parser rewrite", category: "Work", owner: "alice", statuses: [{ id: "todo", label: "To Do", order: 0, count: 1 }], specNote: SPEC_NOTE_ID },
  card: { ...CARD, statusLabel: "To Do", agent: PARSER_BOT, children: [], history: [] },
  agent: { id: PARSER_BOT, indexed: true, role: "tokenizer and parser", openTasks: [{ itemId: CARD_ID, text: "Build parser", status: "todo" }] },
  dependencies: [{ itemId: "c-0", found: true, text: "Agree on grammar", status: "done", completed: true }],
  spec: {
    status: "linked",
    note: { id: SPEC_NOTE_ID, title: "Spec: Parser rewrite", category: "Work", updatedAt: "2026-09-30T10:00:00.000Z", contentLength: 900 },
    goal: "Replace the regex parser.",
    agents: [{ id: PARSER_BOT, role: "tokenizer and parser" }],
    task: { line: "`c-1` - Build parser - agent `parser-bot` - depends on `c-0`", dependsOn: ["c-0"], agent: PARSER_BOT },
    progress: ["- `c-1` / `parser-bot` - tokenizer done, commit 1a2b3c"],
    blockers: [],
    handover: [],
    truncated: false,
  },
};

const _json = (data: unknown, status = 200) => Response.json(data, { status });

const _assign = (boardId: string, agent: unknown): Response => {
  if (agent === BAD_AGENT) return _json({ error: REFUSALS.invalidAgent }, 400);
  const item = agent ? { ...CARD, agent } : CARD;
  const warning = agent === GHOST_BOT ? { warning: UNLISTED_WARNING } : {};
  return _json({ success: true, data: { uuid: boardId, specNote: SPEC_NOTE_ID, items: [item, { ...CARD, id: "c-2" }] }, item, ...warning });
};

const _spec = (boardId: string, noteId: unknown): Response => {
  if (noteId === SECRET_NOTE_ID) return _json({ error: REFUSALS.encrypted }, 400);
  const linked = typeof noteId === "string" && noteId !== "";
  return _json({
    success: true,
    data: { boardId, specNote: linked ? noteId : null, status: linked ? "linked" : "none", agents: linked ? TASK_CONTEXT.spec.agents : [] },
  });
};

const _tasks = (url: URL): Response => {
  const offset = Number(url.searchParams.get("offset")) || 0;
  const limit = Number(url.searchParams.get("limit")) || TASK_TOTAL;
  return _json({ tasks: TASKS.slice(offset, offset + limit), total: TASK_TOTAL });
};

const CARD_ROUTE = /^\/api\/kanban\/([^/]+)\/items\/([^/]+)\/(agent|context)$/;
const SPEC_ROUTE = /^\/api\/kanban\/([^/]+)\/spec$/;

export const agentReply = (url: URL, body: Record<string, unknown> | undefined): Response | null => {
  if (url.pathname === "/api/agents/tasks") return _tasks(url);
  const spec = url.pathname.match(SPEC_ROUTE);
  if (spec) return _spec(spec[1] ?? "", body?.noteId);
  const card = url.pathname.match(CARD_ROUTE);
  if (!card) return null;
  if (card[3] === "agent") return _assign(card[1] ?? "", body?.agent);
  return card[2] === CARD_ID ? _json({ success: true, data: TASK_CONTEXT }) : _json({ error: "Card not found" }, 404);
};
