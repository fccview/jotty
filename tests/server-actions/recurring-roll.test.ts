import { describe, it, expect, beforeEach, vi } from "vitest";
import { Checklist } from "@/app/_types";
import { PermissionTypes } from "@/app/_types/enums";
import { StampRefusals } from "@/app/_consts/identity";
import { rollRecurring } from "@/app/_server/actions/checklist/recurring";

const OWNER = "owner";
const EDITOR = "editor";
const READER = "reader";
const LIST_UUID = "5f0c1d2e-3a4b-4c5d-8e6f-7a8b9c0d1e2f";
const LIST_PATH = "/data/checklists/owner/Home/chores.md";

const GRANTS: Record<string, PermissionTypes[]> = {
  [OWNER]: [PermissionTypes.READ, PermissionTypes.EDIT],
  [EDITOR]: [PermissionTypes.READ, PermissionTypes.EDIT],
  [READER]: [PermissionTypes.READ],
};

const mockWrite = vi.fn();
const mockBroadcast = vi.fn();
const mockCanReach = vi.fn();
let stored: Checklist;

const chores = (completed: boolean): Checklist => ({
  uuid: LIST_UUID,
  id: "chores",
  title: "Chores",
  category: "Home",
  owner: OWNER,
  type: "simple",
  items: [
    {
      id: "bins",
      text: "Take the bins out",
      completed,
      order: 0,
      recurrence: {
        rrule: "FREQ=WEEKLY;INTERVAL=1",
        dtstart: "2020-01-06T09:00:00.000Z",
        nextDue: "2020-01-13T09:00:00.000Z",
      },
    },
  ],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
});

vi.mock("@/app/_server/actions/file", () => ({
  serverWriteFile: (...args: unknown[]) => mockWrite(...args),
}));

vi.mock("@/app/_server/actions/checklist/queries", () => ({
  getListById: async () => stored,
}));

vi.mock("@/app/_utils/grep-utils", () => ({
  grepFindFileByUuid: async () => ({ filePath: LIST_PATH, id: "chores", category: "Home" }),
}));

vi.mock("@/app/_server/actions/share/queries", () => ({
  canReach: (...args: unknown[]) => mockCanReach(...args),
}));

vi.mock("@/app/_server/actions/ws/broadcast", () => ({
  broadcast: (...args: unknown[]) => mockBroadcast(...args),
}));

describe("rolling recurring items on read", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stored = chores(true);
    mockWrite.mockResolvedValue(undefined);
    mockCanReach.mockImplementation(async (_uuid: string, _type: string, username: string, permission: PermissionTypes) =>
      (GRANTS[username] || []).includes(permission),
    );
  });

  it("saves the rolled item and broadcasts when an editor reads the list", async () => {
    const rolled = await rollRecurring(chores(true), EDITOR);

    expect(rolled.items[0].completed).toBe(false);
    expect(mockWrite).toHaveBeenCalledWith(LIST_PATH, expect.any(String));
    expect(mockBroadcast).toHaveBeenCalledWith(expect.objectContaining({ entityId: LIST_UUID, username: OWNER }));
  });

  it("shows a reader the current occurrence without touching the owner's file", async () => {
    const rolled = await rollRecurring(chores(true), READER);

    expect(rolled.items[0].completed).toBe(false);
    expect(rolled.items[0].recurrence?.nextDue).not.toBe("2020-01-13T09:00:00.000Z");
    expect(mockWrite).not.toHaveBeenCalled();
    expect(mockBroadcast).not.toHaveBeenCalled();
  });

  it("does nothing, not even a permission check, when no item is due", async () => {
    const list = chores(false);

    expect(await rollRecurring(list, READER)).toBe(list);
    expect(mockCanReach).not.toHaveBeenCalled();
    expect(mockWrite).not.toHaveBeenCalled();
  });

  it("does not write when the stored list was already rolled by someone else", async () => {
    stored = chores(false);

    const rolled = await rollRecurring(chores(true), OWNER);

    expect(rolled.items[0].completed).toBe(false);
    expect(mockWrite).not.toHaveBeenCalled();
  });

  it("answers with the list as it was re-read, not a mix of two revisions", async () => {
    stored = { ...chores(true), title: "Renamed chores", tags: ["home"] };

    const rolled = await rollRecurring({ ...chores(true), category: "Shared/Home", isShared: true }, EDITOR);

    expect(rolled).toMatchObject({ title: "Renamed chores", tags: ["home"], category: "Shared/Home", isShared: true });
    expect(rolled.items[0].completed).toBe(false);
  });

  it("never writes a list whose file it can't safely stamp", async () => {
    stored = { ...chores(true), lockReason: StampRefusals.FOREIGN_UUID };

    const rolled = await rollRecurring(chores(true), OWNER);

    expect(rolled.items[0].completed).toBe(false);
    expect(mockWrite).not.toHaveBeenCalled();
  });
});
