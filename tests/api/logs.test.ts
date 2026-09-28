import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  mockUser,
  mockAuthenticateApiKey,
  resetApiMocks,
  createMockRequest,
  getResponseJson,
} from "./setup";

const mockDigUpLogs = vi.fn();
const mockEveryUsername = vi.fn();
const mockCleanupOldLogs = vi.fn();

vi.mock("@/app/_server/actions/log", () => ({
  cleanupOldLogs: (...args: unknown[]) => mockCleanupOldLogs(...args),
  getDailyLogPath: vi.fn(),
  getDateRange: vi.fn(),
}));

vi.mock("@/app/_server/actions/lib/audit-trail", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/_server/actions/lib/audit-trail")>()),
  digUpLogs: (...args: unknown[]) => mockDigUpLogs(...args),
  everyUsername: (...args: unknown[]) => mockEveryUsername(...args),
}));

import { GET as LIST } from "@/app/api/logs/route";
import { GET as STATS } from "@/app/api/logs/stats/route";
import { POST as EXPORT } from "@/app/api/logs/export/route";
import { POST as CLEANUP } from "@/app/api/logs/cleanup/route";

const ADMIN = { ...mockUser, isAdmin: true };

const entry = (overrides: Record<string, unknown>) => ({
  id: "1",
  uuid: "u1",
  timestamp: "2026-09-01T10:00:00.000Z",
  level: "INFO",
  username: "testuser",
  action: "login",
  category: "auth",
  ipAddress: "::1",
  userAgent: "curl",
  success: true,
  ...overrides,
});

const LOGS = [
  entry({ id: "1", timestamp: "2026-09-01T10:00:00.000Z" }),
  entry({ id: "2", timestamp: "2026-09-03T10:00:00.000Z", category: "security", level: "WARNING", success: false }),
  entry({ id: "3", timestamp: "2026-09-02T10:00:00.000Z", action: "note_created", category: "note" }),
];

const list = (query = "") => LIST(createMockRequest("GET", `http://localhost:3000/api/logs${query}`));

describe("Logs API", () => {
  beforeEach(() => {
    resetApiMocks();
    mockAuthenticateApiKey.mockResolvedValue(mockUser);
    mockDigUpLogs.mockReset().mockResolvedValue(LOGS);
    mockEveryUsername.mockReset().mockResolvedValue(["testuser", "otheruser"]);
    mockCleanupOldLogs.mockReset().mockResolvedValue({ success: true, deletedFiles: 0 });
  });

  describe("GET /api/logs", () => {
    it("reads only your own logs when you are not an admin", async () => {
      const response = await list();
      const data = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(mockDigUpLogs.mock.calls[0][0]).toEqual(["testuser"]);
      expect(data.success).toBe(true);
      expect(data.total).toBe(3);
      expect(data.logs.map((log: { id: string }) => log.id)).toEqual(["2", "3", "1"]);
    });

    it("refuses a non-admin asking for somebody else", async () => {
      const response = await list("?username=otheruser");

      expect(response.status).toBe(403);
      expect((await getResponseJson(response)).error).toBe("Forbidden: You can only view your own logs");
      expect(mockDigUpLogs).not.toHaveBeenCalled();
    });

    it("reads everybody for an admin who names nobody", async () => {
      mockAuthenticateApiKey.mockResolvedValue(ADMIN);

      await list();

      expect(mockDigUpLogs.mock.calls[0][0]).toEqual(["testuser", "otheruser"]);
    });

    it.each(["../etc", "a/b", "a\\b"])("refuses a username that walks out of the logs folder: %s", async (name) => {
      mockAuthenticateApiKey.mockResolvedValue(ADMIN);

      const response = await list(`?username=${encodeURIComponent(name)}`);

      expect(response.status).toBe(400);
      expect(mockDigUpLogs).not.toHaveBeenCalled();
    });

    it("reads one user for an admin who names them", async () => {
      mockAuthenticateApiKey.mockResolvedValue(ADMIN);

      await list("?username=otheruser");

      expect(mockEveryUsername).not.toHaveBeenCalled();
      expect(mockDigUpLogs.mock.calls[0][0]).toEqual(["otheruser"]);
    });

    it("accepts the security category and filters by success", async () => {
      const data = await getResponseJson(await list("?category=security&success=false"));

      expect(data.total).toBe(1);
      expect(data.logs[0].id).toBe("2");
    });

    it("applies limit and offset from the query string", async () => {
      const data = await getResponseJson(await list("?limit=1&offset=1"));

      expect(data.total).toBe(3);
      expect(data.logs.map((log: { id: string }) => log.id)).toEqual(["3"]);
    });

    it("rejects a level that does not exist", async () => {
      const response = await list("?level=LOUD");

      expect(response.status).toBe(400);
      expect(mockDigUpLogs).not.toHaveBeenCalled();
    });

    it("rejects a limit that is not a number", async () => {
      expect((await list("?limit=lots")).status).toBe(400);
    });
  });

  describe("GET /api/logs/stats", () => {
    it("is admin only", async () => {
      const response = await STATS(createMockRequest("GET", "http://localhost:3000/api/logs/stats"));

      expect(response.status).toBe(403);
      expect((await getResponseJson(response)).error).toBe("Admin access required");
    });

    it("counts levels, categories, actions and users", async () => {
      mockAuthenticateApiKey.mockResolvedValue(ADMIN);

      const data = await getResponseJson(
        await STATS(createMockRequest("GET", "http://localhost:3000/api/logs/stats")),
      );

      expect(data.totalLogs).toBe(3);
      expect(data.logsByLevel).toEqual({ DEBUG: 0, INFO: 2, WARNING: 1, ERROR: 0, CRITICAL: 0 });
      expect(data.logsByCategory).toEqual({ auth: 1, security: 1, note: 1 });
      expect(data.topActions[0]).toEqual({ action: "login", count: 2 });
      expect(data.topUsers).toEqual([{ username: "testuser", count: 3 }]);
      expect(data.recentActivity[0].id).toBe("2");
    });
  });

  describe("POST /api/logs/export", () => {
    const exportLogs = (body: unknown) =>
      EXPORT(createMockRequest("POST", "http://localhost:3000/api/logs/export", body));

    it("keeps the old message for a bad format", async () => {
      const response = await exportLogs({ format: "xml" });

      expect(response.status).toBe(400);
      expect((await getResponseJson(response)).error).toBe("Invalid format. Must be 'json' or 'csv'");
    });

    it("pins a non-admin to their own logs whatever username they send", async () => {
      await exportLogs({ format: "json", filters: { username: "otheruser" } });

      expect(mockDigUpLogs.mock.calls[0][0]).toEqual(["testuser"]);
    });

    it("sends CSV as an attachment", async () => {
      const response = await exportLogs({ format: "csv", filters: { level: "WARNING" } });
      const text = await response.text();

      expect(response.headers.get("Content-Type")).toBe("text/csv");
      expect(response.headers.get("Content-Disposition")).toMatch(/^attachment; filename="audit-logs-\d+\.csv"$/);
      expect(text.split("\n")).toHaveLength(2);
      expect(text).toContain('"security"');
    });

    it("trims to the limit in the filters", async () => {
      const response = await exportLogs({ format: "json", filters: { limit: 2 } });

      expect(JSON.parse(await response.text())).toHaveLength(2);
    });
  });

  describe("POST /api/logs/cleanup", () => {
    const cleanup = () => CLEANUP(createMockRequest("POST", "http://localhost:3000/api/logs/cleanup"));

    it("is admin only", async () => {
      expect((await cleanup()).status).toBe(403);
      expect(mockCleanupOldLogs).not.toHaveBeenCalled();
    });

    it("returns the cleanup result for an admin", async () => {
      mockAuthenticateApiKey.mockResolvedValue(ADMIN);

      const data = await getResponseJson(await cleanup());

      expect(data).toEqual({ success: true, deletedFiles: 0 });
    });
  });
});
