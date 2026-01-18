import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockCookies, mockFs, resetAllMocks, createFormData } from "../setup";

const mockReadJsonFile = vi.fn();
const mockWriteJsonFile = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockLogAuthEvent = vi.fn();

vi.mock("@/app/_server/actions/file", () => ({
  readJsonFile: (...args: any[]) => mockReadJsonFile(...args),
  writeJsonFile: (...args: any[]) => mockWriteJsonFile(...args),
}));

vi.mock("@/app/_server/actions/users", () => ({
  getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
}));

vi.mock("@/app/_server/actions/log", () => ({
  logAuthEvent: (...args: any[]) => mockLogAuthEvent(...args),
}));

vi.mock("next/headers", () => ({
  cookies: () => mockCookies,
  headers: () => ({
    get: (name: string) => {
      if (name === "user-agent") return "Test Browser";
      if (name === "x-forwarded-for") return "127.0.0.1";
      return null;
    },
  }),
}));

import {
  readSessionData,
  readSessions,
  createSession,
  removeSession,
  getSessionsForUser,
  getSessionId,
  removeAllSessionsForUser,
  clearAllSessions,
  terminateSession,
  terminateAllOtherSessions,
} from "@/app/_server/actions/session";

describe("Session Actions", () => {
  beforeEach(() => {
    resetAllMocks();
    mockReadJsonFile.mockResolvedValue({});
    mockWriteJsonFile.mockResolvedValue(undefined);
    mockGetCurrentUser.mockResolvedValue({ username: "testuser" });
    mockLogAuthEvent.mockResolvedValue(undefined);
    mockCookies.get.mockReturnValue({ value: "session-123" });
    mockFs.writeFile.mockResolvedValue(undefined);
  });

  describe("readSessionData", () => {
    it("should return empty object when no sessions", async () => {
      mockReadJsonFile.mockResolvedValue(null);

      const result = await readSessionData();

      expect(result).toEqual({});
    });

    it("should return existing session data", async () => {
      const mockData = {
        "session-1": {
          id: "session-1",
          username: "testuser",
          userAgent: "Browser",
          ipAddress: "127.0.0.1",
          createdAt: "2024-01-01T00:00:00.000Z",
          lastActivity: "2024-01-01T00:00:00.000Z",
        },
      };
      mockReadJsonFile.mockResolvedValue(mockData);

      const result = await readSessionData();

      expect(result).toEqual(mockData);
    });
  });

  describe("readSessions", () => {
    it("should return empty object when no sessions", async () => {
      mockReadJsonFile.mockResolvedValue(null);

      const result = await readSessions();

      expect(result).toEqual({});
    });

    it("should return existing sessions", async () => {
      mockReadJsonFile.mockResolvedValue({
        "session-1": "user1",
        "session-2": "user2",
      });

      const result = await readSessions();

      expect(result).toEqual({
        "session-1": "user1",
        "session-2": "user2",
      });
    });
  });

  describe("createSession", () => {
    it("should create a new session", async () => {
      mockReadJsonFile.mockResolvedValue({});

      await createSession("new-session-id", "newuser", "local");

      expect(mockWriteJsonFile).toHaveBeenCalledTimes(2);
      expect(mockWriteJsonFile).toHaveBeenCalledWith(
        expect.objectContaining({ "new-session-id": "newuser" }),
        expect.any(String),
      );
    });
  });

  describe("removeSession", () => {
    it("should remove a session", async () => {
      mockReadJsonFile
        .mockResolvedValueOnce({
          "session-1": {
            id: "session-1",
            username: "testuser",
          },
        })
        .mockResolvedValueOnce({ "session-1": "testuser" });

      await removeSession("session-1");

      expect(mockWriteJsonFile).toHaveBeenCalledTimes(2);
    });
  });

  describe("getSessionsForUser", () => {
    it("should return sessions for a specific user", async () => {
      mockReadJsonFile.mockResolvedValue({
        "session-1": { id: "session-1", username: "testuser" },
        "session-2": { id: "session-2", username: "otheruser" },
        "session-3": { id: "session-3", username: "testuser" },
      });

      const result = await getSessionsForUser("testuser");

      expect(result).toHaveLength(2);
      expect(result.every((s) => s.username === "testuser")).toBe(true);
    });

    it("should return empty array when user has no sessions", async () => {
      mockReadJsonFile.mockResolvedValue({
        "session-1": { id: "session-1", username: "otheruser" },
      });

      const result = await getSessionsForUser("testuser");

      expect(result).toEqual([]);
    });
  });

  describe("getSessionId", () => {
    it("should return session ID from cookie", async () => {
      mockCookies.get.mockReturnValue({ value: "my-session-123" });

      const result = await getSessionId();

      expect(result).toBe("my-session-123");
    });

    it("should return empty string when no cookie", async () => {
      mockCookies.get.mockReturnValue(undefined);

      const result = await getSessionId();

      expect(result).toBe("");
    });
  });

  describe("removeAllSessionsForUser", () => {
    it("should remove all sessions for a user", async () => {
      mockReadJsonFile
        .mockResolvedValueOnce({
          "session-1": { id: "session-1", username: "testuser" },
          "session-2": { id: "session-2", username: "testuser" },
          "session-3": { id: "session-3", username: "otheruser" },
        })
        .mockResolvedValueOnce({
          "session-1": "testuser",
          "session-2": "testuser",
          "session-3": "otheruser",
        });

      await removeAllSessionsForUser("testuser");

      expect(mockWriteJsonFile).toHaveBeenCalled();
    });

    it("should keep excepted session when specified", async () => {
      mockReadJsonFile
        .mockResolvedValueOnce({
          "session-1": { id: "session-1", username: "testuser" },
          "session-2": { id: "session-2", username: "testuser" },
        })
        .mockResolvedValueOnce({
          "session-1": "testuser",
          "session-2": "testuser",
        });

      await removeAllSessionsForUser("testuser", "session-1");

      expect(mockWriteJsonFile).toHaveBeenCalled();
    });
  });

  describe("clearAllSessions", () => {
    it("should clear all sessions", async () => {
      const result = await clearAllSessions();

      expect(result.success).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalledTimes(2);
    });

    it("should handle errors", async () => {
      mockFs.writeFile.mockRejectedValue(new Error("Write error"));

      const result = await clearAllSessions();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to clear all sessions");
    });
  });

  describe("terminateSession", () => {
    it("should return error when not authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const formData = createFormData({ sessionId: "session-123" });

      const result = await terminateSession(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("should return error when session ID not provided", async () => {
      const formData = createFormData({});

      const result = await terminateSession(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Session ID is required");
    });

    it("should terminate session successfully", async () => {
      mockReadJsonFile.mockResolvedValue({});

      const formData = createFormData({ sessionId: "session-to-terminate" });

      const result = await terminateSession(formData);

      expect(result.success).toBe(true);
      expect(mockLogAuthEvent).toHaveBeenCalledWith(
        "session_terminated",
        "testuser",
        true,
      );
    });
  });

  describe("terminateAllOtherSessions", () => {
    it("should return error when not authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const result = await terminateAllOtherSessions();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("should terminate all other sessions", async () => {
      mockReadJsonFile.mockResolvedValue({
        "session-123": { id: "session-123", username: "testuser" },
        "session-456": { id: "session-456", username: "testuser" },
      });
      mockCookies.get.mockReturnValue({ value: "session-123" });

      const result = await terminateAllOtherSessions();

      expect(result.success).toBe(true);
    });
  });
});
