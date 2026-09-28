import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  mockUser,
  mockAuthenticateApiKey,
  mockSharesInvolving as mockShares,
  resetApiMocks,
  createMockRequest,
  getResponseJson,
} from "./setup";
import { ShareDirections } from "@/app/_consts/sharing";
import { ItemTypes } from "@/app/_types/enums";

const mockVisible = vi.fn();
const mockLink = vi.fn();
const mockRelated = vi.fn();

vi.mock("@/app/_server/actions/relations/queries", () => ({
  visibleItems: (...args: unknown[]) => mockVisible(...args),
}));
vi.mock("@/app/_server/actions/relations/explore", () => ({
  LINKS_OFF: "Links are turned off on this instance",
  NOT_VISIBLE: "Not found",
  DENIED: "Permission denied",
  linkItems: (...args: unknown[]) => mockLink(...args),
  relatedFor: (...args: unknown[]) => mockRelated(...args),
}));

import { GET as SHARES } from "@/app/api/shares/route";
import { POST as CONNECT } from "@/app/api/relations/links/route";
import { GET as RELATED } from "@/app/api/relations/[itemId]/route";

const READ = { canRead: true, canEdit: false, canDelete: false };
const ALL = { canRead: true, canEdit: true, canDelete: true, canCreate: true };

const visible = new Map([
  ["n-1", { uuid: "n-1", type: ItemTypes.NOTE, title: "Holiday plan", category: "Travel", owner: "bob", tags: [] }],
  ["c-1", { uuid: "c-1", type: ItemTypes.CHECKLIST, title: "Groceries", category: "Home", owner: "testuser", tags: [] }],
]);

const shares = (query = "") =>
  SHARES(createMockRequest("GET", `http://localhost:3000/api/shares${query}`));

const connect = (body: object) =>
  CONNECT(createMockRequest("POST", "http://localhost:3000/api/relations/links", body));

describe("Relations and shares contracts", () => {
  beforeEach(() => {
    resetApiMocks();
    mockAuthenticateApiKey.mockResolvedValue(mockUser);
    mockVisible.mockResolvedValue(visible);
    mockShares.mockResolvedValue([
      { uuid: "n-1", type: ItemTypes.NOTE, owner: "bob", direction: ShareDirections.WITH_ME, permissions: READ },
      {
        uuid: "c-1",
        type: ItemTypes.CHECKLIST,
        owner: "testuser",
        direction: ShareDirections.BY_ME,
        isPublic: true,
        viaCategory: "Home",
        people: [["alice", ALL], ["public", READ]],
      },
      { uuid: "gone", type: ItemTypes.NOTE, owner: "bob", direction: ShareDirections.WITH_ME, permissions: READ },
    ]);
  });

  describe("GET /api/shares", () => {
    it("lists both directions with titles, dropping items the caller can't see", async () => {
      const response = await shares();
      const body = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(mockShares).toHaveBeenCalledWith(mockUser.username);
      expect(body.total).toBe(2);
      expect(body.shares).toEqual([
        expect.objectContaining({ uuid: "c-1", title: "Groceries", isPublic: true, viaCategory: "Home" }),
        expect.objectContaining({ uuid: "n-1", title: "Holiday plan", owner: "bob", permissions: READ }),
      ]);
    });

    it("never lists the public pseudo-user as a person", async () => {
      const body = await getResponseJson(await shares(`?direction=${ShareDirections.BY_ME}`));
      expect(body.shares).toHaveLength(1);
      expect(body.shares[0].sharedWith).toEqual([{ username: "alice", permissions: ALL }]);
    });

    it("filters by type and pages", async () => {
      const body = await getResponseJson(await shares("?type=note&limit=1"));
      expect(body.shares.map((share: { uuid: string }) => share.uuid)).toEqual(["n-1"]);
      expect(body.total).toBe(1);
    });
  });

  describe("POST /api/relations/links", () => {
    it("links as the key owner, appending by default", async () => {
      mockLink.mockResolvedValue({ success: true, data: null });
      const response = await connect({ source: "n-1", target: "c-1" });
      expect(response.status).toBe(200);
      expect(mockLink).toHaveBeenCalledWith(mockUser, "n-1", "c-1", "append");
    });

    it.each([
      ["Not found", 404],
      ["Links are turned off on this instance", 404],
      ["Permission denied", 403],
      ["Encrypted notes stay closed", 400],
    ])("turns %s into a %i", async (error, status) => {
      mockLink.mockResolvedValue({ success: false, error });
      const response = await connect({ source: "n-1", target: "c-1", style: "mention" });
      expect(response.status).toBe(status);
      expect((await getResponseJson(response)).error).toBe(error);
    });

    it("rejects a missing target before touching anything", async () => {
      const response = await connect({ source: "n-1" });
      expect(response.status).toBe(400);
      expect(mockLink).not.toHaveBeenCalled();
    });
  });

  it("GET /api/relations/{itemId} is a 404 for items the caller can't see", async () => {
    mockRelated.mockResolvedValue({ success: false, error: "Not found" });
    const response = await RELATED(createMockRequest("GET", "http://localhost:3000/api/relations/x"), {
      params: Promise.resolve({ itemId: "x" }),
    });
    expect(response.status).toBe(404);
    expect(mockRelated).toHaveBeenCalledWith(mockUser, "x");
  });
});
