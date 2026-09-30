import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  mockUser,
  mockAuthenticateApiKey,
  mockGetListById,
  mockGetUserChecklists,
  mockCanReach,
  resetApiMocks,
  createMockRequest,
  getResponseJson,
} from "./setup";
import { SpecSections, SpecStatus, SPEC_ENCRYPTED, AGENT_NOT_INDEXED } from "@/app/_consts/agents";

const mockAssignAgent = vi.fn();
const mockPinSpec = vi.fn();
const mockReadSpec = vi.fn();

vi.mock("@/app/_server/actions/kanban/agents", () => ({
  assignAgent: (...args: unknown[]) => mockAssignAgent(...args),
}));

vi.mock("@/app/_server/actions/kanban/spec-pin", () => ({
  pinSpec: (...args: unknown[]) => mockPinSpec(...args),
}));

vi.mock("@/app/_server/actions/kanban/spec", () => ({
  readSpec: (...args: unknown[]) => mockReadSpec(...args),
}));

import { PUT as ASSIGN_AGENT } from "@/app/api/kanban/[boardId]/items/[itemId]/agent/route";
import { PUT as SET_SPEC } from "@/app/api/kanban/[boardId]/spec/route";
import { GET as TASK_CONTEXT } from "@/app/api/kanban/[boardId]/items/[itemId]/context/route";
import { GET as AGENT_TASKS } from "@/app/api/agents/tasks/route";

const BOARD_UUID = "4f1c2b3a-5d6e-4f70-8a9b-0c1d2e3f4a5b";
const SPEC_UUID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const BASE = `http://localhost:3000/api/kanban/${BOARD_UUID}`;

const board = (overrides: Record<string, unknown> = {}) => ({
  id: "sprint",
  uuid: BOARD_UUID,
  title: "Sprint",
  category: "Work",
  type: "kanban",
  owner: mockUser.username,
  specNote: SPEC_UUID,
  statuses: [
    { id: "todo", label: "To Do", order: 0 },
    { id: "doing", label: "Doing", order: 1 },
    { id: "done", label: "Done", order: 2, autoComplete: true },
  ],
  items: [
    {
      id: "card-1",
      text: "Tokenizer",
      completed: false,
      order: 0,
      status: "doing",
      agent: "parser-bot",
      assignee: "alice",
      description: "Line one\\nLine two",
      history: Array.from({ length: 7 }, (_, index) => ({
        status: "doing",
        timestamp: `2026-01-0${index + 1}T00:00:00.000Z`,
        user: "alice",
      })),
      children: [
        { id: "card-1a", text: "Escapes", completed: false, order: 0, status: "todo", agent: "parser-bot" },
      ],
    },
    { id: "card-2", text: "Preview", completed: false, order: 1, status: "todo", agent: "ui-bot" },
    { id: "card-3", text: "Docs", completed: true, order: 2, status: "done", agent: "parser-bot" },
    { id: "card-4", text: "Human only", completed: false, order: 3, status: "todo", assignee: "bob" },
  ],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-02T00:00:00.000Z",
  ...overrides,
});

const linkedSpec = {
  status: SpecStatus.LINKED,
  note: {
    id: SPEC_UUID,
    title: "Spec: Parser",
    category: "Plans",
    owner: mockUser.username,
    updatedAt: "2026-01-05T00:00:00.000Z",
    contentLength: 400,
  },
  sections: {
    [SpecSections.GOAL]: "Ship it",
    [SpecSections.ACCEPTANCE]: "- tests pass",
    [SpecSections.TASKS]: "- `card-1` - tokenizer - agent `parser-bot` - depends on `card-2`, `ghost`",
    [SpecSections.PROGRESS]: "- card-1 half done\n- card-2 not started\n- parser-bot pushed a branch",
    [SpecSections.BLOCKERS]: "- waiting on card-9",
    [SpecSections.HANDOVER]: "- `card-1` / `parser-bot` - next: escapes",
  },
  agents: [
    { id: "parser-bot", role: "tokenizer" },
    { id: "ui-bot", role: "preview" },
  ],
};

const cardParams = (itemId = "card-1") => ({ params: Promise.resolve({ boardId: BOARD_UUID, itemId }) });
const boardParams = () => ({ params: Promise.resolve({ boardId: BOARD_UUID }) });

describe("Agent coordination API", () => {
  beforeEach(() => {
    resetApiMocks();
    mockAssignAgent.mockReset();
    mockPinSpec.mockReset();
    mockReadSpec.mockReset();
    mockAuthenticateApiKey.mockResolvedValue(mockUser);
    mockGetListById.mockResolvedValue(board());
    mockReadSpec.mockResolvedValue(linkedSpec);
  });

  describe("PUT /api/kanban/:boardId/items/:itemId/agent", () => {
    it("sets the agent and answers like assignBoardItem", async () => {
      const changed = board();
      mockAssignAgent.mockResolvedValue({ success: true, data: changed });

      const response = await ASSIGN_AGENT(
        createMockRequest("PUT", `${BASE}/items/card-1/agent`, { agent: "Parser-Bot" }),
        cardParams(),
      );
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(mockAssignAgent).toHaveBeenCalledWith(mockUser, BOARD_UUID, "card-1", "Parser-Bot");
      expect(data.success).toBe(true);
      expect(data.item).toMatchObject({ id: "card-1", agent: "parser-bot", assignee: "alice" });
    });

    it("passes a missing agent through as a clear", async () => {
      mockAssignAgent.mockResolvedValue({ success: true, data: board() });

      await ASSIGN_AGENT(createMockRequest("PUT", `${BASE}/items/card-1/agent`, {}), cardParams());

      expect(mockAssignAgent).toHaveBeenCalledWith(mockUser, BOARD_UUID, "card-1", undefined);
    });

    it("turns a refusal into a 400 with the refusal text", async () => {
      mockAssignAgent.mockResolvedValue({ success: false, error: AGENT_NOT_INDEXED });

      const response = await ASSIGN_AGENT(
        createMockRequest("PUT", `${BASE}/items/card-1/agent`, { agent: "ghost-bot" }),
        cardParams(),
      );

      expect(response.status).toBe(400);
      expect(await getResponseJson(response)).toEqual({ error: AGENT_NOT_INDEXED });
    });

    it("answers 404 for an unknown card and 403 without edit", async () => {
      const ghost = await ASSIGN_AGENT(
        createMockRequest("PUT", `${BASE}/items/nope/agent`, { agent: "parser-bot" }),
        cardParams("nope"),
      );
      mockCanReach.mockResolvedValue(false);
      const denied = await ASSIGN_AGENT(
        createMockRequest("PUT", `${BASE}/items/card-1/agent`, { agent: "parser-bot" }),
        cardParams(),
      );

      expect(ghost.status).toBe(404);
      expect(denied.status).toBe(403);
      expect(mockAssignAgent).not.toHaveBeenCalled();
    });
  });

  describe("PUT /api/kanban/:boardId/spec", () => {
    it("pins the spec and returns its agents", async () => {
      const pinned = { boardId: BOARD_UUID, specNote: SPEC_UUID, status: SpecStatus.LINKED, agents: linkedSpec.agents };
      mockPinSpec.mockResolvedValue({ success: true, data: pinned });

      const response = await SET_SPEC(createMockRequest("PUT", `${BASE}/spec`, { noteId: SPEC_UUID }), boardParams());

      expect(response.status).toBe(200);
      expect(await getResponseJson(response)).toEqual({ success: true, data: pinned });
      expect(mockPinSpec).toHaveBeenCalledWith(mockUser, BOARD_UUID, SPEC_UUID);
    });

    it("clears with null and refuses encrypted notes with 400", async () => {
      mockPinSpec.mockResolvedValueOnce({
        success: true,
        data: { boardId: BOARD_UUID, specNote: null, status: SpecStatus.NONE, agents: [] },
      });
      const cleared = await SET_SPEC(createMockRequest("PUT", `${BASE}/spec`, { noteId: null }), boardParams());
      expect(mockPinSpec).toHaveBeenLastCalledWith(mockUser, BOARD_UUID, null);
      expect((await getResponseJson(cleared)).data.specNote).toBeNull();

      mockPinSpec.mockResolvedValueOnce({ success: false, error: SPEC_ENCRYPTED });
      const refused = await SET_SPEC(createMockRequest("PUT", `${BASE}/spec`, { noteId: SPEC_UUID }), boardParams());
      expect(refused.status).toBe(400);
      expect(await getResponseJson(refused)).toEqual({ error: SPEC_ENCRYPTED });
    });

    it("refuses readers with 403 before touching the spec", async () => {
      mockCanReach.mockResolvedValue(false);
      const response = await SET_SPEC(createMockRequest("PUT", `${BASE}/spec`, { noteId: SPEC_UUID }), boardParams());

      expect(response.status).toBe(403);
      expect(mockPinSpec).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/kanban/:boardId/items/:itemId/context", () => {
    it("bundles the card, its agent, dependencies and the relevant spec parts", async () => {
      const response = await TASK_CONTEXT(createMockRequest("GET", `${BASE}/items/card-1/context`), cardParams());
      const { success, data } = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(success).toBe(true);
      expect(data.board).toMatchObject({ id: BOARD_UUID, title: "Sprint", owner: mockUser.username, specNote: SPEC_UUID });
      expect(data.board.statuses).toEqual([
        { id: "todo", label: "To Do", order: 0, count: 2 },
        { id: "doing", label: "Doing", order: 1, count: 1 },
        { id: "done", label: "Done", order: 2, count: 1 },
      ]);
      expect(data.card).toMatchObject({
        id: "card-1",
        status: "doing",
        statusLabel: "Doing",
        agent: "parser-bot",
        assignee: "alice",
        description: "Line one\nLine two",
        children: [{ id: "card-1a", text: "Escapes", status: "todo", completed: false, agent: "parser-bot" }],
      });
      expect(data.card.history).toHaveLength(5);
      expect(data.agent).toEqual({
        id: "parser-bot",
        indexed: true,
        role: "tokenizer",
        openTasks: [{ itemId: "card-1a", text: "Escapes", status: "todo" }],
      });
      expect(data.dependencies).toEqual([
        { itemId: "card-2", found: true, text: "Preview", status: "todo", completed: false },
        { itemId: "ghost", found: false },
      ]);
      expect(data.spec).toMatchObject({
        status: SpecStatus.LINKED,
        goal: "Ship it",
        acceptance: "- tests pass",
        task: { dependsOn: ["card-2", "ghost"], agent: "parser-bot" },
        progress: ["- card-1 half done", "- parser-bot pushed a branch"],
        blockers: [],
        handover: ["- `card-1` / `parser-bot` - next: escapes"],
        truncated: false,
      });
      expect(mockReadSpec).toHaveBeenCalledWith(SPEC_UUID, mockUser.username);
    });

    it("keeps encrypted specs opaque", async () => {
      mockReadSpec.mockResolvedValue({ status: SpecStatus.ENCRYPTED, sections: {}, agents: [] });

      const { data } = await getResponseJson(
        await TASK_CONTEXT(createMockRequest("GET", `${BASE}/items/card-1/context`), cardParams()),
      );

      expect(data.spec).toEqual({
        status: SpecStatus.ENCRYPTED,
        agents: [],
        progress: [],
        blockers: [],
        handover: [],
        truncated: false,
      });
      expect(data.agent).toMatchObject({ id: "parser-bot", indexed: false });
    });

    it("bounds long parts and says so", async () => {
      mockReadSpec.mockResolvedValue({
        ...linkedSpec,
        sections: {
          [SpecSections.GOAL]: "g".repeat(2500),
          [SpecSections.PROGRESS]: Array.from({ length: 14 }, (_, index) => `- card-1 step ${index} ${"x".repeat(700)}`).join("\n"),
        },
      });

      const { data } = await getResponseJson(
        await TASK_CONTEXT(createMockRequest("GET", `${BASE}/items/card-1/context`), cardParams()),
      );

      expect(data.spec.goal).toHaveLength(2000);
      expect(data.spec.progress).toHaveLength(10);
      expect(data.spec.progress[9].startsWith("- card-1 step 13")).toBe(true);
      expect(data.spec.progress.every((entry: string) => entry.length <= 600)).toBe(true);
      expect(data.spec.truncated).toBe(true);
    });

    it("answers 404 for a card that is not on the board", async () => {
      const response = await TASK_CONTEXT(createMockRequest("GET", `${BASE}/items/nope/context`), cardParams("nope"));
      expect(response.status).toBe(404);
    });
  });

  describe("GET /api/agents/tasks", () => {
    beforeEach(() => {
      mockGetUserChecklists.mockResolvedValue({
        success: true,
        data: [
          board(),
          board({ uuid: "list-1", type: "simple", items: [{ id: "x", text: "x", completed: false, order: 0, agent: "parser-bot" }] }),
          board({
            uuid: "5e5e5e5e-5e5e-4e5e-8e5e-5e5e5e5e5e5e",
            title: "Shared",
            owner: "carol",
            specNote: undefined,
            items: [{ id: "s-1", text: "Shared card", completed: false, order: 0, status: "todo", agent: "ui-bot" }],
          }),
        ],
      });
    });

    it("lists open agent cards across visible boards, subtasks included", async () => {
      const data = await getResponseJson(await AGENT_TASKS(createMockRequest("GET", "http://localhost:3000/api/agents/tasks")));

      expect(data.total).toBe(4);
      expect(data.tasks.map((task: { itemId: string }) => task.itemId)).toEqual(["card-1", "card-1a", "card-2", "s-1"]);
      expect(data.tasks[1]).toMatchObject({ parentId: "card-1", boardId: BOARD_UUID, specNote: SPEC_UUID, statusLabel: "To Do" });
      expect(data.tasks[3]).toMatchObject({ boardTitle: "Shared", specNote: null });
      expect(mockGetUserChecklists).toHaveBeenCalledWith({ username: mockUser.username });
    });

    it("filters by agent, board, status and completion, and pages", async () => {
      const call = async (query: string) =>
        getResponseJson(await AGENT_TASKS(createMockRequest("GET", `http://localhost:3000/api/agents/tasks?${query}`)));

      expect((await call("agent=Parser-Bot")).tasks.map((task: { itemId: string }) => task.itemId)).toEqual(["card-1", "card-1a"]);
      expect((await call("agent=parser-bot&includeCompleted=true")).total).toBe(3);
      expect((await call(`boardId=${BOARD_UUID}&status=todo,done`)).tasks.map((task: { itemId: string }) => task.itemId)).toEqual(["card-1a", "card-2"]);
      const paged = await call("limit=1&offset=1");
      expect(paged).toMatchObject({ total: 4, tasks: [{ itemId: "card-1a" }] });
    });

    it("refuses a board id that is not a uuid", async () => {
      const response = await AGENT_TASKS(createMockRequest("GET", "http://localhost:3000/api/agents/tasks?boardId=../x"));
      expect(response.status).toBe(400);
    });

    it("needs an API key", async () => {
      mockAuthenticateApiKey.mockResolvedValue(null);
      const response = await AGENT_TASKS(createMockRequest("GET", "http://localhost:3000/api/agents/tasks"));
      expect(response.status).toBe(401);
    });
  });
});
