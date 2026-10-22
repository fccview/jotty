import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  mockUser,
  mockAuthenticateApiKey,
  mockSharesInvolving,
  resetApiMocks,
  createMockRequest,
  getResponseJson,
} from "./setup";
import { ItemTypes, Modes } from "@/app/_types/enums";
import { PUBLIC_USER, ShareDirections } from "@/app/_consts/sharing";

const mockTarget = vi.fn();
const mockGrant = vi.fn();
const mockRevoke = vi.fn();
const mockVisible = vi.fn();

vi.mock("@/app/_server/actions/relations/queries", () => ({
  visibleItems: (...args: unknown[]) => mockVisible(...args),
}));

vi.mock("@/app/_server/actions/share/listing", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/_server/actions/share/listing")>()),
  shareTarget: (...args: unknown[]) => mockTarget(...args),
}));

vi.mock("@/app/_server/actions/share/grants", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/_server/actions/share/grants")>()),
  grantItem: (...args: unknown[]) => mockGrant(...args),
  revokeItem: (...args: unknown[]) => mockRevoke(...args),
}));

import { PUT } from "@/app/api/shares/[itemId]/route";
import { DELETE } from "@/app/api/shares/[itemId]/[username]/route";
import { GET } from "@/app/api/shares/route";
import { NOT_OWNER, NO_SUCH_USER, SHARE_FAILED } from "@/app/_server/actions/share/grants";

const ITEM = "1b1b1b1b-1b1b-4b1b-8b1b-1b1b1b1b1b1b";
const READ = { canRead: true, canEdit: false, canDelete: false };
const WRITE = { canRead: true, canEdit: true, canDelete: false };
const target = { uuid: ITEM, type: ItemTypes.NOTE, title: "Plan", category: "Work", owner: "testuser", tags: [] };

const share = (body: object) =>
  PUT(createMockRequest("PUT", `http://localhost:3000/api/shares/${ITEM}`, body), {
    params: Promise.resolve({ itemId: ITEM }),
  });

const unshare = (username: string) =>
  DELETE(createMockRequest("DELETE", `http://localhost:3000/api/shares/${ITEM}/${username}`), {
    params: Promise.resolve({ itemId: ITEM, username }),
  });

describe("Share management API", () => {
  beforeEach(() => {
    resetApiMocks();
    mockAuthenticateApiKey.mockResolvedValue(mockUser);
    mockTarget.mockResolvedValue(target);
    mockGrant.mockResolvedValue({ success: true, data: { bob: WRITE, [PUBLIC_USER]: READ } });
    mockRevoke.mockResolvedValue({ success: true, data: {} });
  });

  describe("PUT /api/shares/{itemId}", () => {
    it("grants as the key's owner and answers with who holds it", async () => {
      const response = await share({ username: "bob", permission: "rw" });
      const body = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(mockGrant).toHaveBeenCalledWith(mockUser, Modes.NOTES, ITEM, "bob", WRITE);
      expect(body.data).toEqual({
        id: ITEM,
        type: ItemTypes.NOTE,
        isPublic: true,
        sharedWith: [{ username: "bob", permissions: WRITE }],
      });
    });

    it("defaults to read only", async () => {
      await share({ username: "bob" });
      expect(mockGrant).toHaveBeenCalledWith(mockUser, Modes.NOTES, ITEM, "bob", READ);
    });

    it("rejects a permission outside r, rw and rwd", async () => {
      const response = await share({ username: "bob", permission: "rx" });
      expect(response.status).toBe(400);
      expect(mockGrant).not.toHaveBeenCalled();
    });

    it("answers 404 for an item the caller can't see", async () => {
      mockTarget.mockResolvedValue(undefined);
      const response = await share({ username: "bob" });
      expect(response.status).toBe(404);
      expect(mockGrant).not.toHaveBeenCalled();
    });

    it.each([
      [NOT_OWNER, 403],
      [NO_SUCH_USER, 400],
      [SHARE_FAILED, 500],
    ])("maps %s to %i", async (error, status) => {
      mockGrant.mockResolvedValue({ success: false, error });
      const response = await share({ username: "bob" });
      expect(response.status).toBe(status);
      expect((await getResponseJson(response)).error).toBe(error);
    });
  });

  describe("DELETE /api/shares/{itemId}/{username}", () => {
    it("revokes that one person", async () => {
      const response = await unshare("bob");
      const body = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(mockRevoke).toHaveBeenCalledWith(mockUser, Modes.NOTES, ITEM, "bob");
      expect(body.data).toEqual({ id: ITEM, type: ItemTypes.NOTE, isPublic: false, sharedWith: [] });
    });

    it("answers 403 when the caller doesn't own it", async () => {
      mockRevoke.mockResolvedValue({ success: false, error: NOT_OWNER });
      expect((await unshare("bob")).status).toBe(403);
    });
  });

  describe("GET /api/shares filters", () => {
    beforeEach(() => {
      mockVisible.mockResolvedValue(
        new Map([
          [ITEM, target],
          ["c-1", { ...target, uuid: "c-1", type: ItemTypes.CHECKLIST, title: "Groceries", owner: "alice" }],
        ]),
      );
      mockSharesInvolving.mockResolvedValue([
        { uuid: ITEM, type: ItemTypes.NOTE, owner: "testuser", direction: ShareDirections.BY_ME, people: [["bob", WRITE]] },
        { uuid: "c-1", type: ItemTypes.CHECKLIST, owner: "alice", direction: ShareDirections.WITH_ME, permissions: READ },
      ]);
    });

    const list = async (query: string) =>
      getResponseJson(await GET(createMockRequest("GET", `http://localhost:3000/api/shares${query}`)));

    it("narrows to one item", async () => {
      const body = await list(`?item=${ITEM.toUpperCase()}`);
      expect(body.shares.map((row: { uuid: string }) => row.uuid)).toEqual([ITEM]);
    });

    it("narrows to one person on both sides", async () => {
      expect((await list("?user=bob")).shares.map((row: { uuid: string }) => row.uuid)).toEqual([ITEM]);
      expect((await list("?user=alice")).shares.map((row: { uuid: string }) => row.uuid)).toEqual(["c-1"]);
    });
  });
});
