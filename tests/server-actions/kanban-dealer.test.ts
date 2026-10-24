import { describe, it, expect, beforeEach, vi } from "vitest";
import { Checklist, Item, SanitisedUser } from "@/app/_types";
import { CardPlacement, KanbanPriorityLevel } from "@/app/_types/enums";

vi.unmock("@/app/_utils/checklist-utils");

const BOARD_UUID = "7d3e1f2a-4b5c-4d6e-8f70-1a2b3c4d5e6f";
const BOARD_PATH = "/data/checklists/owner/Work/board.md";
const OWNER = "owner";
const READER = "reader";

const { spies } = vi.hoisted(() => ({
  spies: {
    write: vi.fn(),
    notify: vi.fn(),
    broadcast: vi.fn(),
    board: { current: undefined as unknown },
    insertion: { current: undefined as string | undefined },
    shared: { current: [] as string[] },
  },
}));

vi.mock("@/app/_server/actions/file", () => ({
  ensureDir: vi.fn(),
  serverWriteFile: (...args: unknown[]) => spies.write(...args),
}));

vi.mock("@/app/_server/actions/checklist/queries", () => ({
  getListById: async () => structuredClone(spies.board.current),
}));

vi.mock("@/app/_server/actions/share/queries", () => ({
  reachableFile: async (_uuid: string, _type: string, username: string) =>
    username === OWNER ? BOARD_PATH : null,
  canReach: async (_uuid: string, _type: string, username: string) => username === OWNER || username === "alice",
  usersWithAccess: async () => spies.shared.current,
}));

vi.mock("@/app/_server/actions/users/records", () => ({
  findUserRecord: async (username: string) =>
    username === "ghost" ? null : { username, newItemInsertion: spies.insertion.current },
}));

vi.mock("@/app/_server/actions/ws/broadcast", () => ({
  broadcast: (...args: unknown[]) => spies.broadcast(...args),
}));

vi.mock("@/app/_server/actions/notifications/internal", () => ({
  notifyUser: (...args: unknown[]) => spies.notify(...args),
}));

vi.mock("@/app/_server/actions/attachments/adopt", () => ({
  rehomeRefs: async (_uuid: string, _username: string, body: string) => body,
}));

const owner = { username: OWNER, isAdmin: false } as SanitisedUser;

const card = (id: string, order: number, extra: Partial<Item> = {}): Item => ({
  id: `${BOARD_UUID}-${id}`,
  text: `Card ${id}`,
  completed: false,
  order,
  status: "todo",
  ...extra,
});

const board = (items: Item[] = [card("1", 0), card("2", 1, { externalId: "gh-2" })]): Checklist => ({
  id: "board",
  uuid: BOARD_UUID,
  title: "Board",
  category: "Work",
  owner: OWNER,
  type: "kanban",
  statuses: [
    { id: "todo", label: "To Do", order: 0 },
    { id: "review", label: "Review", order: 1 },
    { id: "done", label: "Done", order: 2, autoComplete: true },
  ],
  items,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
});

const deal = async (...args: Parameters<typeof import("@/app/_server/actions/kanban/dealer").dealCards>) => {
  const { dealCards } = await import("@/app/_server/actions/kanban/dealer");
  return dealCards(...args);
};

const written = async (): Promise<Checklist> => {
  const { parseMarkdown } = await import("@/app/_utils/checklist-utils");
  expect(spies.write).toHaveBeenCalledOnce();
  return parseMarkdown(spies.write.mock.calls[0][1], "board", "Work", OWNER);
};

const texts = (list: Checklist) => [...list.items].sort((a, b) => a.order - b.order).map((item) => item.text);

describe("dealCards", () => {
  beforeEach(() => {
    spies.write.mockReset();
    spies.notify.mockReset();
    spies.broadcast.mockReset();
    spies.board.current = board();
    spies.insertion.current = undefined;
    spies.shared.current = [];
  });

  it("writes the whole batch once, on top and in the order sent", async () => {
    const result = await deal(owner, BOARD_UUID, [{ text: "A" }, { text: "B" }, { text: "C" }]);
    const saved = await written();

    expect(result.success).toBe(true);
    expect(texts(saved)).toEqual(["A", "B", "C", "Card 1", "Card 2"]);
    expect(spies.broadcast).toHaveBeenCalledOnce();
  });

  it("follows the user's bottom setting, and position beats it", async () => {
    spies.insertion.current = CardPlacement.BOTTOM;
    await deal(owner, BOARD_UUID, [{ text: "A" }, { text: "B" }]);
    expect(texts(await written())).toEqual(["Card 1", "Card 2", "A", "B"]);

    spies.write.mockReset();
    await deal(owner, BOARD_UUID, [{ text: "A" }], CardPlacement.TOP);
    expect(texts(await written())).toEqual(["A", "Card 1", "Card 2"]);
  });

  it("gives every new card its own id", async () => {
    const result = await deal(owner, BOARD_UUID, Array.from({ length: 50 }, (_, index) => ({ text: `Card ${index}` })));
    const ids = result.data!.map(({ card: dealt }) => dealt.id);

    expect(new Set(ids).size).toBe(50);
    expect(ids.every((id) => id.startsWith(`${BOARD_UUID}-`))).toBe(true);
  });

  it("sets priority, score and status at creation, and completes cards made in an autoComplete column", async () => {
    const result = await deal(owner, BOARD_UUID, [
      { text: "Urgent", priority: KanbanPriorityLevel.CRITICAL, score: 8, status: "review" },
      { text: "Shipped", status: "done" },
    ]);
    const [urgent, shipped] = result.data!.map(({ card: dealt }) => dealt);

    expect(urgent).toMatchObject({ priority: "critical", score: 8, status: "review", completed: false });
    expect(shipped).toMatchObject({ status: "done", completed: true });
  });

  it("updates the card holding an externalId instead of adding a duplicate, and keeps it through the file", async () => {
    const result = await deal(owner, BOARD_UUID, [
      { text: "Card 2 renamed", externalId: "gh-2", status: "review", description: "Now with notes" },
      { text: "Fresh", externalId: "gh-3" },
    ]);
    const saved = await written();
    const renamed = saved.items.find((item) => item.externalId === "gh-2");

    expect(result.data!.map(({ updated }) => updated)).toEqual([true, false]);
    expect(saved.items).toHaveLength(3);
    expect(renamed).toMatchObject({
      id: `${BOARD_UUID}-2`,
      text: "Card 2 renamed",
      status: "review",
      description: "Now with notes",
    });
    expect(renamed?.history?.at(-1)).toMatchObject({ status: "review", user: OWNER });
    expect(saved.items.find((item) => item.externalId === "gh-3")?.text).toBe("Fresh");
  });

  it("leaves fields that weren't sent alone on an update", async () => {
    spies.board.current = board([card("1", 0, { externalId: "gh-1", priority: "high", description: "Keep me" })]);

    await deal(owner, BOARD_UUID, [{ text: "Card 1", externalId: "gh-1" }]);
    const kept = (await written()).items[0];

    expect(kept).toMatchObject({ priority: "high", description: "Keep me", status: "todo" });
  });

  it("folds a repeated externalId inside one batch into one card", async () => {
    const result = await deal(owner, BOARD_UUID, [
      { text: "First", externalId: "gh-9" },
      { text: "Second", externalId: "gh-9" },
    ]);
    const saved = await written();

    expect(saved.items.filter((item) => item.externalId === "gh-9").map((item) => item.text)).toEqual(["Second"]);
    expect(result.data![0].card.id).toBe(result.data![1].card.id);
  });

  it("saves nothing when one card names a column the board doesn't have", async () => {
    const result = await deal(owner, BOARD_UUID, [{ text: "Fine" }, { text: "Lost", status: "nowhere" }]);

    expect(result.success).toBe(false);
    expect(result.error).toContain("todo, review, done");
    expect(spies.write).not.toHaveBeenCalled();
  });

  it("refuses somebody without edit on the board", async () => {
    const result = await deal({ username: READER, isAdmin: false } as SanitisedUser, BOARD_UUID, [{ text: "Sneaky" }]);

    expect(result).toEqual({ success: false, error: "Permission denied" });
    expect(spies.write).not.toHaveBeenCalled();
  });

  it("notifies an assignee once the cards are saved, and assigns the creator on a shared board", async () => {
    spies.shared.current = ["alice"];

    const result = await deal(owner, BOARD_UUID, [{ text: "Yours", assignee: "alice" }, { text: "Mine" }]);
    const [yours, mine] = result.data!.map(({ card: dealt }) => dealt);

    expect(yours.assignee).toBe("alice");
    expect(mine.assignee).toBe(OWNER);
    expect(spies.notify).toHaveBeenCalledOnce();
    expect(spies.notify.mock.calls[0][0]).toBe("alice");
    expect(spies.notify.mock.calls[0][1].data.taskId).toBe(yours.id);
  });

  it("keeps a card whole through the file when its externalId holds a pipe", async () => {
    const result = await deal(owner, BOARD_UUID, [{ text: "Piped", externalId: "PROJ | 42" }]);
    const saved = await written();
    const piped = saved.items.find((item) => item.text === "Piped");

    expect(result.success).toBe(true);
    expect(piped?.externalId).toBe("PROJ | 42");
    expect(piped?.id).toBe(result.data![0].card.id);
    expect(piped?.createdBy).toBe(OWNER);
  });

  it("re-runs an import when a card keeps an assignee who has since lost access", async () => {
    spies.board.current = board([card("1", 0, { externalId: "gh-1", assignee: "bob" })]);
    const result = await deal(owner, BOARD_UUID, [{ text: "Renamed", externalId: "gh-1", assignee: "bob" }]);

    expect(result.success).toBe(true);
    expect((await written()).items[0].text).toBe("Renamed");
    expect(spies.notify).not.toHaveBeenCalled();
  });

  it("still refuses handing a card to somebody who can't see the board", async () => {
    spies.board.current = board([card("1", 0, { externalId: "gh-1", assignee: "bob" })]);
    const result = await deal(owner, BOARD_UUID, [{ text: "New", externalId: "gh-9", assignee: "bob" }]);

    expect(result.success).toBe(false);
    expect(spies.write).not.toHaveBeenCalled();
  });
});
