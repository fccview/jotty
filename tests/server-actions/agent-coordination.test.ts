import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import path from "path";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { NextRequest } from "next/server";

const { home, root, spies } = vi.hoisted(() => {
  const os = process.getBuiltinModule("os");
  const fs = process.getBuiltinModule("fs");
  const nodePath = process.getBuiltinModule("path");
  const previous = process.cwd();

  process.chdir(fs.mkdtempSync(nodePath.join(os.tmpdir(), "jotty-agents-")));

  return {
    home: previous,
    root: process.cwd(),
    spies: { notify: vi.fn(), findUser: vi.fn() },
  };
});

vi.unmock("fs/promises");
vi.unmock("@/app/_utils/checklist-utils");

vi.mock("@/app/_server/actions/ws/broadcast", () => ({
  broadcast: vi.fn(),
}));

vi.mock("@/app/_server/actions/history/repo", () => ({
  commitNote: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/app/_server/actions/log", () => ({
  logContentEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/app/_server/actions/relations/tracking", () => ({
  trackItemWrite: vi.fn(),
  trackItemDelete: vi.fn(),
  trackTreeDelete: vi.fn(),
  trackMove: vi.fn(),
}));

vi.mock("@/app/_server/actions/notifications/internal", () => ({
  notifyUser: (...args: unknown[]) => spies.notify(...args),
}));

vi.mock("@/app/_server/actions/users/records", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/app/_server/actions/users/records")>();
  return {
    ...real,
    findUserRecord: (...args: Parameters<typeof real.findUserRecord>) => {
      spies.findUser(...args);
      return real.findUserRecord(...args);
    },
  };
});

vi.mock("@/app/_server/actions/users", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/_server/actions/users")>()),
  canAccessAllContent: async () => false,
  getCurrentUser: async () => null,
}));

vi.mock("@/app/_server/actions/api/authenticate", () => ({
  authenticateApiKey: async (key: string) =>
    ["alice", "bob"].includes(key) ? { username: key, isAdmin: false, isSuperAdmin: false } : null,
}));

import { spliceNote } from "@/app/_server/actions/note/splice";
import { findReplace } from "@/app/_utils/note-edits";
import { dropMounts } from "@/app/_server/actions/share/mounts";
import { SpecStatus } from "@/app/_consts/agents";
import { Modes } from "@/app/_types/enums";
import { DATA_DIR, USERS_FILE } from "@/app/_consts/files";
import type { SanitisedUser } from "@/app/_types";

const SHARED_BOARD = "a1a1a1a1-1111-4111-8111-111111111111";
const SOLO_BOARD = "b2b2b2b2-2222-4222-8222-222222222222";
const SHARED_SPEC = "c3c3c3c3-3333-4333-8333-333333333333";
const SOLO_SPEC = "d4d4d4d4-4444-4444-8444-444444444444";

const sharedBoardFile = () => path.join(root, DATA_DIR, Modes.CHECKLISTS, "alice", "Team", "sprint.md");
const soloBoardFile = () => path.join(root, DATA_DIR, Modes.CHECKLISTS, "alice", "Private", "solo.md");
const sharedSpecFile = () => path.join(root, DATA_DIR, Modes.NOTES, "alice", "Plans", "sprint-spec.md");

const writeItem = (file: string, lines: string[]) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${lines.join("\n")}\n`);
};

const seed = () => {
  mkdirSync(path.dirname(path.join(root, USERS_FILE)), { recursive: true });
  writeFileSync(path.join(root, USERS_FILE), JSON.stringify([{ username: "alice" }, { username: "bob" }]));

  writeItem(sharedBoardFile(), [
    "---",
    `uuid: ${SHARED_BOARD}`,
    "title: Sprint",
    "checklistType: kanban",
    "sharedWith: bob:rw",
    "---",
    '- [ ] Tokenizer | status:in_progress | time:0 | assignee:bob | metadata:{"id":"card-a"}',
    '- [ ] Preview | time:0 | metadata:{"id":"card-b"}',
    '- [x] Setup | status:completed | time:0 | metadata:{"id":"card-c"}',
  ]);

  writeItem(soloBoardFile(), [
    "---",
    `uuid: ${SOLO_BOARD}`,
    "title: Solo",
    "checklistType: kanban",
    "---",
    '- [ ] Secret plan | time:0 | assignee:alice | metadata:{"id":"card-s"}',
  ]);

  writeItem(sharedSpecFile(), [
    "---",
    `uuid: ${SHARED_SPEC}`,
    "title: Sprint spec",
    "sharedWith: bob:rw",
    "---",
    "# Spec: Sprint",
    "",
    "## Goal",
    "Ship the parser.",
    "",
    "## Agents",
    "- `parser-bot` - tokenizer work",
    "- `ui-bot` - preview work",
    "",
    "## Tasks",
    "- `card-a` - tokenizer - agent `parser-bot` - depends on `card-c`, `card-z`",
    "- `card-b` - preview - agent `ui-bot` - depends on `card-a`",
    "",
    "## Progress",
    "- card-b: mockups ready",
    "",
    "## Handover",
    "- nothing yet",
  ]);

  writeItem(path.join(root, DATA_DIR, Modes.NOTES, "alice", "Private", "solo-spec.md"), [
    "---",
    `uuid: ${SOLO_SPEC}`,
    "title: Solo spec",
    "---",
    "## Agents",
    "- `solo-bot` - does the secret plan",
  ]);
};

const request = (key: string, method: string, url: string, body?: unknown) =>
  new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    headers: { "Content-Type": "application/json", "x-api-key": key },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

const routes = async () => ({
  spec: await import("@/app/api/kanban/[boardId]/spec/route"),
  agent: await import("@/app/api/kanban/[boardId]/items/[itemId]/agent/route"),
  context: await import("@/app/api/kanban/[boardId]/items/[itemId]/context/route"),
  tasks: await import("@/app/api/agents/tasks/route"),
});

const pinAs = async (key: string, boardId: string, noteId: string | null) =>
  (await routes()).spec.PUT(
    request(key, "PUT", `/api/kanban/${boardId}/spec`, { noteId }),
    { params: Promise.resolve({ boardId }) },
  );

const agentAs = async (key: string, boardId: string, itemId: string, agent: string | null) =>
  (await routes()).agent.PUT(
    request(key, "PUT", `/api/kanban/${boardId}/items/${itemId}/agent`, { agent }),
    { params: Promise.resolve({ boardId, itemId }) },
  );

const contextAs = async (key: string, boardId: string, itemId: string) =>
  (await routes()).context.GET(
    request(key, "GET", `/api/kanban/${boardId}/items/${itemId}/context`),
    { params: Promise.resolve({ boardId, itemId }) },
  );

const tasksAs = async (key: string, query = "") => {
  const response = await (await routes()).tasks.GET(request(key, "GET", `/api/agents/tasks${query}`));
  return response.json();
};

const idsOf = (body: { tasks: { itemId: string }[] }) => body.tasks.map((task) => task.itemId);

const lineOf = (file: string, text: string) =>
  readFileSync(file, "utf-8").split("\n").find((line) => line.includes(text)) || "";

beforeAll(() => {
  rmSync(path.join(root, DATA_DIR), { recursive: true, force: true });
  dropMounts(Modes.NOTES);
  dropMounts(Modes.CHECKLISTS);
  seed();
});

afterAll(() => {
  process.chdir(home);
  rmSync(root, { recursive: true, force: true });
});

describe("Virtual agents coordinating on real board files", () => {
  it("lets the owner pin a spec on a shared and a private board", async () => {
    const shared = await pinAs("alice", SHARED_BOARD, SHARED_SPEC);
    const solo = await pinAs("alice", SOLO_BOARD, SOLO_SPEC);

    expect(shared.status).toBe(200);
    expect((await shared.json()).data).toEqual({
      boardId: SHARED_BOARD,
      specNote: SHARED_SPEC,
      status: SpecStatus.LINKED,
      agents: [
        { id: "parser-bot", role: "tokenizer work" },
        { id: "ui-bot", role: "preview work" },
      ],
    });
    expect(solo.status).toBe(200);
    expect(readFileSync(sharedBoardFile(), "utf-8")).toContain(`specNote: ${SHARED_SPEC}`);
    expect(readFileSync(soloBoardFile(), "utf-8")).toContain(`specNote: ${SOLO_SPEC}`);
  });

  it("keeps the collaborator out of the private board", async () => {
    expect((await pinAs("bob", SOLO_BOARD, SHARED_SPEC)).status).toBe(404);
    expect((await agentAs("bob", SOLO_BOARD, "card-s", "solo-bot")).status).toBe(404);
    expect((await contextAs("bob", SOLO_BOARD, "card-s")).status).toBe(404);
    expect(readFileSync(soloBoardFile(), "utf-8")).toContain(`specNote: ${SOLO_SPEC}`);
  });

  it("lets the collaborator assign agents on the shared board without touching the human assignee", async () => {
    const before = lineOf(sharedBoardFile(), "Tokenizer");
    expect(before).toContain("| assignee:bob |");

    const set = await agentAs("bob", SHARED_BOARD, "card-a", " Parser-Bot ");
    expect(set.status).toBe(200);
    expect((await set.json()).item).toMatchObject({ id: "card-a", agent: "parser-bot", assignee: "bob" });

    expect((await agentAs("bob", SHARED_BOARD, "card-b", "ui-bot")).status).toBe(200);
    expect((await agentAs("bob", SHARED_BOARD, "card-c", "parser-bot")).status).toBe(200);

    const unlisted = await agentAs("bob", SHARED_BOARD, "card-b", "ghost-bot");
    expect(unlisted.status).toBe(200);
    expect(lineOf(sharedBoardFile(), "Preview")).toContain("| agent:ghost-bot |");
    expect((await agentAs("bob", SHARED_BOARD, "card-b", "ui-bot")).status).toBe(200);

    expect(lineOf(sharedBoardFile(), "Tokenizer")).toContain("| assignee:bob | agent:parser-bot |");
    expect(lineOf(sharedBoardFile(), "Preview")).toContain("| agent:ui-bot |");
  });

  it("clears and restores an agent while the assignee stays put", async () => {
    expect((await agentAs("alice", SHARED_BOARD, "card-a", null)).status).toBe(200);
    const cleared = lineOf(sharedBoardFile(), "Tokenizer");
    expect(cleared).toContain("| assignee:bob |");
    expect(cleared).not.toContain("agent:");

    expect((await agentAs("alice", SHARED_BOARD, "card-a", "parser-bot")).status).toBe(200);
    expect(lineOf(sharedBoardFile(), "Tokenizer")).toContain("| assignee:bob | agent:parser-bot |");
  });

  it("lets the owner assign an agent on the private board", async () => {
    expect((await agentAs("alice", SOLO_BOARD, "card-s", "solo-bot")).status).toBe(200);
    expect(lineOf(soloBoardFile(), "Secret plan")).toContain("| assignee:alice | agent:solo-bot |");
  });

  it("appends progress and handover to the spec through the real patch path", async () => {
    const bob = { username: "bob", isAdmin: false } as SanitisedUser;

    const progress = await spliceNote(bob, SHARED_SPEC, (body) =>
      findReplace(body, "- card-b: mockups ready", "- card-b: mockups ready\n- card-a: parser-bot finished the lexer\n  escapes still missing"),
    );
    const handover = await spliceNote(bob, SHARED_SPEC, (body) =>
      findReplace(body, "- nothing yet", "- nothing yet\n- `card-a` / `parser-bot` - next: escapes"),
    );

    expect(progress.success).toBe(true);
    expect(handover.success).toBe(true);
    expect(readFileSync(sharedSpecFile(), "utf-8")).toContain("next: escapes");
  });

  it("rebuilds the task picture from the files alone in a clean session", async () => {
    vi.resetModules();

    const response = await contextAs("bob", SHARED_BOARD, "card-a");
    const { data } = await response.json();

    expect(response.status).toBe(200);
    expect(data.board).toMatchObject({ id: SHARED_BOARD, title: "Sprint", owner: "alice", specNote: SHARED_SPEC });
    expect(data.card).toMatchObject({
      id: "card-a",
      status: "in_progress",
      statusLabel: "In Progress",
      agent: "parser-bot",
      assignee: "bob",
      completed: false,
    });
    expect(data.agent).toEqual({ id: "parser-bot", indexed: true, role: "tokenizer work", openTasks: [] });
    expect(data.dependencies).toEqual([
      { itemId: "card-c", found: true, text: "Setup", status: "completed", completed: true },
      { itemId: "card-z", found: false },
    ]);
    expect(data.spec).toMatchObject({
      status: SpecStatus.LINKED,
      note: { id: SHARED_SPEC, title: "Sprint spec", category: "Plans", owner: "alice" },
      goal: "Ship the parser.",
      agents: [
        { id: "parser-bot", role: "tokenizer work" },
        { id: "ui-bot", role: "preview work" },
      ],
      task: { dependsOn: ["card-c", "card-z"], agent: "parser-bot" },
      progress: ["- card-a: parser-bot finished the lexer\n  escapes still missing"],
      handover: ["- `card-a` / `parser-bot` - next: escapes"],
      truncated: false,
    });
  });

  it("lists agent tasks from the files, filtered and scoped to what each user sees", async () => {
    vi.resetModules();

    expect(idsOf(await tasksAs("bob"))).toEqual(["card-a", "card-b"]);
    expect(idsOf(await tasksAs("bob", "?includeCompleted=true"))).toEqual(["card-a", "card-b", "card-c"]);
    expect(idsOf(await tasksAs("bob", "?agent=parser-bot&includeCompleted=true"))).toEqual(["card-a", "card-c"]);
    expect(idsOf(await tasksAs("bob", "?status=todo"))).toEqual(["card-b"]);
    expect(idsOf(await tasksAs("bob", `?boardId=${SOLO_BOARD}`))).toEqual([]);

    const alice = await tasksAs("alice", `?boardId=${SOLO_BOARD}`);
    expect(alice.tasks).toEqual([
      expect.objectContaining({
        boardId: SOLO_BOARD,
        boardTitle: "Solo",
        specNote: SOLO_SPEC,
        itemId: "card-s",
        agent: "solo-bot",
        assignee: "alice",
        statusLabel: "To Do",
      }),
    ]);
    expect((await tasksAs("alice")).total).toBe(3);
    expect((await tasksAs("bob")).tasks[0]).toMatchObject({ boardTitle: "Sprint", specNote: SHARED_SPEC, assignee: "bob" });
  });

  it("never looked up or notified anybody on behalf of an agent", () => {
    expect(spies.notify).not.toHaveBeenCalled();
    expect(spies.findUser).not.toHaveBeenCalled();
  });
});
