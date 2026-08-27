import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetAllMocks } from "../setup";

const mockGetCurrentUser = vi.fn();
const mockGetUserNotes = vi.fn();
const mockGetUserChecklists = vi.fn();
const mockGetUserModeDir = vi.fn();
const mockServerReadFile = vi.fn();
const mockServerWriteFile = vi.fn();

vi.mock("@/app/_server/actions/users", () => ({
  getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
}));

vi.mock("@/app/_server/actions/note", () => ({
  getUserNotes: (...args: any[]) => mockGetUserNotes(...args),
}));

vi.mock("@/app/_server/actions/checklist", () => ({
  getUserChecklists: (...args: any[]) => mockGetUserChecklists(...args),
}));

vi.mock("@/app/_server/actions/file", () => ({
  getUserModeDir: (...args: any[]) => mockGetUserModeDir(...args),
  serverReadFile: (...args: any[]) => mockServerReadFile(...args),
  serverWriteFile: (...args: any[]) => mockServerWriteFile(...args),
}));

import {
  rebuildLinkIndex,
  rebuildLinkIndexInternal,
} from "@/app/_server/actions/link";

describe("link/index — auth-aware rebuild paths", () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetUserModeDir.mockResolvedValue("/fake/notes");
    mockServerWriteFile.mockResolvedValue(undefined);
    mockGetUserNotes.mockResolvedValue({ success: true, data: [] });
    mockGetUserChecklists.mockResolvedValue({ success: true, data: [] });
  });

  describe("rebuildLinkIndex (public)", () => {
    it("throws when not authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      await expect(rebuildLinkIndex("alice")).rejects.toThrow(
        "Not authenticated",
      );
      expect(mockGetUserNotes).not.toHaveBeenCalled();
    });

    it("throws when the caller is neither the owner nor an admin", async () => {
      mockGetCurrentUser.mockResolvedValue({
        username: "bob",
        isAdmin: false,
      });

      await expect(rebuildLinkIndex("alice")).rejects.toThrow(
        "Unauthorized: can only rebuild your own link index",
      );
      expect(mockGetUserNotes).not.toHaveBeenCalled();
    });

    it("proceeds for the owner", async () => {
      mockGetCurrentUser.mockResolvedValue({
        username: "alice",
        isAdmin: false,
      });

      await expect(rebuildLinkIndex("alice")).resolves.toBeUndefined();
      expect(mockGetUserNotes).toHaveBeenCalledWith({ username: "alice" });
    });

    it("proceeds for an admin rebuilding another user's index", async () => {
      mockGetCurrentUser.mockResolvedValue({
        username: "admin",
        isAdmin: true,
      });

      await expect(rebuildLinkIndex("alice")).resolves.toBeUndefined();
      expect(mockGetUserNotes).toHaveBeenCalledWith({ username: "alice" });
    });
  });

  describe("rebuildLinkIndexInternal", () => {
    it("skips the auth check entirely and rebuilds for the given owner", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      await expect(
        rebuildLinkIndexInternal("someone-else"),
      ).resolves.toBeUndefined();

      expect(mockGetCurrentUser).not.toHaveBeenCalled();
      expect(mockGetUserNotes).toHaveBeenCalledWith({
        username: "someone-else",
      });
      expect(mockGetUserChecklists).toHaveBeenCalledWith({
        username: "someone-else",
      });
      expect(mockServerWriteFile).toHaveBeenCalledTimes(1);
    });
  });
});