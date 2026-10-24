import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  getCurrentUser,
  canAccessAllContent,
  getUserIndex,
  linksEnabled,
  visibleItems,
  backlinksFor,
  graphFor,
  rebuildRelations,
  rebuildOwnerRelations,
  ownerRow,
} = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  canAccessAllContent: vi.fn(),
  getUserIndex: vi.fn(),
  linksEnabled: vi.fn(),
  visibleItems: vi.fn(),
  backlinksFor: vi.fn(),
  graphFor: vi.fn(),
  rebuildRelations: vi.fn(),
  rebuildOwnerRelations: vi.fn(),
  ownerRow: vi.fn(),
}));

vi.mock("@/app/_server/actions/users", () => ({ getCurrentUser, canAccessAllContent }));
vi.mock("@/app/_server/actions/users/helpers", () => ({ getUserIndex }));
vi.mock("@/app/_server/actions/relations/queries", () => ({ visibleItems, backlinksFor, graphFor }));
vi.mock("@/app/_server/actions/relations/night-shift", () => ({ rebuildRelations, rebuildOwnerRelations }));
vi.mock("@/app/_server/actions/relations/store", () => ({
  relationsDb: () => ({ prepare: () => ({ get: ownerRow }) }),
}));
vi.mock("@/app/_server/actions/relations/explore", () => ({ linksEnabled, linkItems: vi.fn() }));

import {
  getBrain,
  getItemRelations,
  reindexRelations,
} from "@/app/_server/actions/relations";

const ITEM = "3f2a1b4c-1111-4222-8333-944455556666";
const BOB = { username: "bob", isAdmin: false };
const ADMIN = { username: "root", isAdmin: true };

beforeEach(() => {
  vi.clearAllMocks();
  linksEnabled.mockResolvedValue(true);
  canAccessAllContent.mockResolvedValue(false);
  getUserIndex.mockResolvedValue(0);
  visibleItems.mockResolvedValue(new Set<string>());
  backlinksFor.mockReturnValue({ uuid: ITEM, backlinks: [{ uuid: "leak" }] });
  graphFor.mockReturnValue({ nodes: [], edges: [] });
  ownerRow.mockReturnValue({ owner: "alice" });
});

describe("reindexRelations", () => {
  it("refuses a logged-in user who isn't an admin and rebuilds nothing", async () => {
    getCurrentUser.mockResolvedValue(BOB);

    expect(await reindexRelations()).toEqual({ success: false, error: "Admins only" });
    expect(await reindexRelations("alice")).toEqual({ success: false, error: "Admins only" });
    expect(rebuildRelations).not.toHaveBeenCalled();
    expect(rebuildOwnerRelations).not.toHaveBeenCalled();
  });

  it("lets an admin rebuild one existing user", async () => {
    getCurrentUser.mockResolvedValue(ADMIN);
    rebuildOwnerRelations.mockResolvedValue(3);

    expect(await reindexRelations("alice")).toEqual({ success: true, data: 3 });
  });
});

describe("getBrain", () => {
  it("won't show another user's brain to somebody without full content access", async () => {
    getCurrentUser.mockResolvedValue(BOB);

    expect(await getBrain("alice")).toEqual({ success: false, error: "Not found" });
    expect(graphFor).not.toHaveBeenCalled();
    expect(visibleItems).not.toHaveBeenCalled();
  });

  it("needs full content access and an existing user to peek", async () => {
    getCurrentUser.mockResolvedValue(ADMIN);
    canAccessAllContent.mockResolvedValue(true);
    getUserIndex.mockResolvedValue(-1);

    expect(await getBrain("ghost")).toEqual({ success: false, error: "Not found" });

    getUserIndex.mockResolvedValue(0);
    expect((await getBrain("alice")).success).toBe(true);
    expect(visibleItems).toHaveBeenLastCalledWith("alice");
  });
});

describe("getItemRelations", () => {
  it("reads nothing for a logged-out caller", async () => {
    getCurrentUser.mockResolvedValue(null);

    expect((await getItemRelations(ITEM)).backlinks).toEqual([]);
    expect(visibleItems).not.toHaveBeenCalled();
    expect(backlinksFor).not.toHaveBeenCalled();
  });

  it("refuses an item the caller can't see when they lack full content access", async () => {
    getCurrentUser.mockResolvedValue(BOB);

    expect((await getItemRelations(ITEM)).backlinks).toEqual([]);
    expect(backlinksFor).not.toHaveBeenCalled();
  });

  it("answers for an item the caller can see, scoped to what they can see", async () => {
    getCurrentUser.mockResolvedValue(BOB);
    const visible = new Set([ITEM]);
    visibleItems.mockResolvedValue(visible);

    await getItemRelations(ITEM);
    expect(backlinksFor).toHaveBeenCalledWith(ITEM, visible);
  });
});
