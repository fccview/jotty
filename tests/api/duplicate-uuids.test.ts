import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  mockUser,
  mockAuthenticateApiKey,
  mockGetAppSettings,
  resetApiMocks,
  createMockRequest,
  getResponseJson,
} from "./setup";

const mockUserIndex = vi.fn();
const mockFind = vi.fn();
const mockRepair = vi.fn();

vi.mock("@/app/_server/actions/users/helpers", () => ({
  getUserIndex: (...args: unknown[]) => mockUserIndex(...args),
}));
vi.mock("@/app/_server/actions/uuid-clash/scan", () => ({
  findClashes: (...args: unknown[]) => mockFind(...args),
}));
vi.mock("@/app/_server/actions/uuid-clash/repair", () => ({
  NO_CLASH: "No duplicate for that uuid",
  NOT_CLAIMANT: "That path does not hold the duplicated uuid",
  repairClash: (...args: unknown[]) => mockRepair(...args),
}));

import { GET, POST } from "@/app/api/admin/duplicate-uuids/route";

const DUP = "aaaaaaaa-1111-4222-8333-944455556666";
const admin = { ...mockUser, isAdmin: true };
const superAdmin = { ...mockUser, isAdmin: true, isSuperAdmin: true };

const list = (query = "") => GET(createMockRequest("GET", `http://localhost:3000/api/admin/duplicate-uuids${query}`));
const repair = (body: object) =>
  POST(createMockRequest("POST", "http://localhost:3000/api/admin/duplicate-uuids", body));

describe("duplicate uuid routes", () => {
  beforeEach(() => {
    resetApiMocks();
    mockAuthenticateApiKey.mockResolvedValue(mockUser);
    mockUserIndex.mockResolvedValue(0);
    mockFind.mockResolvedValue([]);
    mockGetAppSettings.mockResolvedValue({ success: true, data: { adminContentAccess: "yes" } });
  });

  it("lists the caller's own duplicates", async () => {
    mockFind.mockResolvedValue([{ uuid: DUP, owner: mockUser.username, files: [] }]);
    const response = await list();
    expect(response.status).toBe(200);
    expect((await getResponseJson(response)).total).toBe(1);
    expect(mockFind).toHaveBeenCalledWith(mockUser.username);
  });

  it("refuses somebody else's files to a plain user, before saying whether they exist", async () => {
    mockUserIndex.mockResolvedValue(-1);
    expect((await list("?username=bob")).status).toBe(403);
    expect((await repair({ uuid: DUP, username: "bob" })).status).toBe(403);
    expect(mockFind).not.toHaveBeenCalled();
    expect(mockRepair).not.toHaveBeenCalled();
  });

  it("refuses an admin when the instance keeps admins out of other people's content", async () => {
    mockAuthenticateApiKey.mockResolvedValue(admin);
    mockGetAppSettings.mockResolvedValue({ success: true, data: { adminContentAccess: "no" } });
    expect((await list("?username=bob")).status).toBe(403);
    expect(mockFind).not.toHaveBeenCalled();
  });

  it("lets an admin with content access, or the superadmin, look at another user", async () => {
    mockAuthenticateApiKey.mockResolvedValue(admin);
    expect((await list("?username=bob")).status).toBe(200);
    expect(mockFind).toHaveBeenCalledWith("bob");

    mockGetAppSettings.mockResolvedValue({ success: true, data: { adminContentAccess: "no" } });
    mockAuthenticateApiKey.mockResolvedValue(superAdmin);
    expect((await list("?username=bob")).status).toBe(200);
  });

  it("repairs and maps a missing duplicate to 404", async () => {
    mockRepair.mockResolvedValue({ success: true, data: { uuid: DUP, rekeyed: [], relinked: [], ambiguous: [], skipped: [] } });
    const response = await repair({ uuid: DUP, path: "notes/Home/a.md" });
    expect(response.status).toBe(200);
    expect(mockRepair).toHaveBeenCalledWith(mockUser, mockUser.username, DUP, "notes/Home/a.md");

    mockRepair.mockResolvedValue({ success: false, error: "No duplicate for that uuid" });
    expect((await repair({ uuid: DUP })).status).toBe(404);
  });
});
