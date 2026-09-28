import { describe, it, expect, beforeEach, vi } from "vitest";
import path from "path";
import { createFormData, mockFs, resetAllMocks } from "../setup";

const mockGetCurrentUser = vi.fn();
const mockReachableFile = vi.fn();
const mockGetListById = vi.fn();
const mockServerWriteFile = vi.fn();
const mockSweep = vi.fn();
const mockCount = vi.fn();

vi.mock("@/app/_server/actions/users", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
  isAdmin: async () => Boolean((await mockGetCurrentUser())?.isAdmin),
}));

vi.mock("@/app/_server/actions/share/queries", () => ({
  canReach: vi.fn().mockResolvedValue(false),
  reachableFile: (...args: unknown[]) => mockReachableFile(...args),
}));

vi.mock("@/app/_server/actions/checklist/queries", () => ({
  getListById: (...args: unknown[]) => mockGetListById(...args),
  getUserChecklists: vi.fn(),
}));

vi.mock("@/app/_server/actions/file", () => ({
  serverWriteFile: (...args: unknown[]) => mockServerWriteFile(...args),
  ensureDir: vi.fn(),
}));

vi.mock("@/app/_server/actions/ws/broadcast", () => ({ broadcast: vi.fn() }));

vi.mock("@/app/_server/actions/log/sweep", () => ({
  sweepOldLogs: (...args: unknown[]) => mockSweep(...args),
  countOldLogs: (...args: unknown[]) => mockCount(...args),
}));

vi.mock("@/app/_server/api/caller-scope", () => ({ apiCaller: () => undefined }));

vi.mock("next/headers", () => ({
  cookies: () => ({ get: vi.fn() }),
  headers: () => ({ get: () => null }),
}));

import { convertChecklistType } from "@/app/_server/actions/checklist/converters";
import { cleanupOldLogs, checkCleanupNeeded } from "@/app/_server/actions/log/cleanup";
import { logAudit } from "@/app/_server/actions/log/writers";

const LIST_PATH = "/srv/jotty/data/checklists/alice/Home/groceries.md";

describe("Security: sweep guards", () => {
  beforeEach(() => {
    resetAllMocks();
    mockServerWriteFile.mockReset();
    mockReachableFile.mockReset();
    mockGetListById.mockReset();
    mockSweep.mockReset().mockResolvedValue({ success: true, deletedFiles: 0 });
    mockCount.mockReset().mockResolvedValue({ needed: false, count: 0, maxAge: 0 });
  });

  describe("convertChecklistType", () => {
    const convert = () =>
      convertChecklistType(createFormData({ uuid: "list-uuid", newType: "task" }));

    it("refuses without a session", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      expect(await convert()).toEqual({ error: "Not authenticated" });
      expect(mockServerWriteFile).not.toHaveBeenCalled();
    });

    it("refuses a user without edit on the list", async () => {
      mockGetCurrentUser.mockResolvedValue({ username: "mallory" });
      mockReachableFile.mockResolvedValue(null);

      expect(await convert()).toEqual({ error: "Permission denied" });
      expect(mockReachableFile).toHaveBeenCalledWith("list-uuid", "checklist", "mallory", "canEdit");
      expect(mockServerWriteFile).not.toHaveBeenCalled();
    });

    it("writes to the file the permission check resolved", async () => {
      mockGetCurrentUser.mockResolvedValue({ username: "bob" });
      mockReachableFile.mockResolvedValue(LIST_PATH);
      mockGetListById.mockResolvedValue({
        id: "somewhere-else",
        uuid: "list-uuid",
        type: "simple",
        category: "../../mallory",
        owner: "mallory",
        createdAt: "2024-01-01",
        items: [],
      });

      await convert();

      expect(mockServerWriteFile).toHaveBeenCalledTimes(1);
      expect(mockServerWriteFile.mock.calls[0][0]).toBe(LIST_PATH);
    });
  });

  describe("log cleanup", () => {
    it("refuses without a session", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      expect((await cleanupOldLogs()).success).toBe(false);
      expect(mockSweep).not.toHaveBeenCalled();
    });

    it("keeps a regular user to their own logs", async () => {
      mockGetCurrentUser.mockResolvedValue({ username: "bob", isAdmin: false });

      expect((await cleanupOldLogs("alice", 1)).success).toBe(false);
      await cleanupOldLogs(undefined, 1);

      expect(mockSweep).toHaveBeenCalledTimes(1);
      expect(mockSweep).toHaveBeenCalledWith("bob", 1);
    });

    it("refuses a traversing username even for an admin", async () => {
      mockGetCurrentUser.mockResolvedValue({ username: "root", isAdmin: true });

      expect((await cleanupOldLogs("../../notes/alice", 1)).success).toBe(false);
      expect((await checkCleanupNeeded("../x")).needed).toBe(false);
      expect(mockSweep).not.toHaveBeenCalled();
      expect(mockCount).not.toHaveBeenCalled();
    });
  });

  describe("audit log paths", () => {
    it.each(["../../notes/alice/Secret", "a/b", "..", ".hidden", "a\0b"])(
      "keeps the entry for %j inside the logs folder",
      async (username) => {
        mockGetCurrentUser.mockResolvedValue(null);
        mockFs.readFile.mockRejectedValue(new Error("ENOENT"));
        mockFs.writeFile.mockResolvedValue(undefined);

        await logAudit({ level: "WARNING", action: "login", category: "auth", success: false, username });

        const written = String(mockFs.writeFile.mock.calls[0][0]);
        const logsRoot = path.join(process.cwd(), "data", "logs", "system") + path.sep;
        expect(written.startsWith(logsRoot)).toBe(true);
      },
    );
  });
});
