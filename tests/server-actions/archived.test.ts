import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetAllMocks } from "../setup";

const mockGetCurrentUser = vi.fn();
const mockGetUserChecklists = vi.fn();
const mockGetUserNotes = vi.fn();

vi.mock("@/app/_server/actions/users", () => ({
  getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
}));

vi.mock("@/app/_server/actions/checklist", () => ({
  getUserChecklists: (...args: any[]) => mockGetUserChecklists(...args),
}));

vi.mock("@/app/_server/actions/note", () => ({
  getUserNotes: (...args: any[]) => mockGetUserNotes(...args),
}));

import { getArchivedItems } from "@/app/_server/actions/archived";

describe("Archived Actions", () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetCurrentUser.mockResolvedValue({ username: "testuser" });
    mockGetUserChecklists.mockResolvedValue({ success: true, data: [] });
    mockGetUserNotes.mockResolvedValue({ success: true, data: [] });
  });

  describe("getArchivedItems", () => {
    it("should return error when not authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const result = await getArchivedItems();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("should return empty array when no archived items", async () => {
      mockGetUserChecklists.mockResolvedValue({
        success: true,
        data: [{ id: "list-1", category: "Work", title: "Active List" }],
      });
      mockGetUserNotes.mockResolvedValue({
        success: true,
        data: [{ id: "note-1", category: "Work", title: "Active Note" }],
      });

      const result = await getArchivedItems();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it("should return archived checklists", async () => {
      mockGetUserChecklists.mockResolvedValue({
        success: true,
        data: [
          {
            id: "list-1",
            category: ".archive",
            title: "Archived List",
            owner: "testuser",
            updatedAt: "2024-01-01T00:00:00.000Z",
          },
          { id: "list-2", category: "Work", title: "Active List" },
        ],
      });
      mockGetUserNotes.mockResolvedValue({ success: true, data: [] });

      const result = await getArchivedItems();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]).toMatchObject({
        id: "list-1",
        title: "Archived List",
        type: "checklist",
      });
    });

    it("should return archived notes", async () => {
      mockGetUserChecklists.mockResolvedValue({ success: true, data: [] });
      mockGetUserNotes.mockResolvedValue({
        success: true,
        data: [
          {
            id: "note-1",
            category: ".archive",
            title: "Archived Note",
            owner: "testuser",
            updatedAt: "2024-01-01T00:00:00.000Z",
          },
          { id: "note-2", category: "Personal", title: "Active Note" },
        ],
      });

      const result = await getArchivedItems();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]).toMatchObject({
        id: "note-1",
        title: "Archived Note",
        type: "note",
      });
    });

    it("should return both archived checklists and notes", async () => {
      mockGetUserChecklists.mockResolvedValue({
        success: true,
        data: [
          {
            id: "list-1",
            category: ".archive",
            title: "Archived List",
            owner: "testuser",
            updatedAt: "2024-01-02T00:00:00.000Z",
          },
        ],
      });
      mockGetUserNotes.mockResolvedValue({
        success: true,
        data: [
          {
            id: "note-1",
            category: ".archive",
            title: "Archived Note",
            owner: "testuser",
            updatedAt: "2024-01-01T00:00:00.000Z",
          },
        ],
      });

      const result = await getArchivedItems();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it("should sort archived items by updatedAt descending", async () => {
      mockGetUserChecklists.mockResolvedValue({
        success: true,
        data: [
          {
            id: "list-1",
            category: ".archive",
            title: "Older List",
            updatedAt: "2024-01-01T00:00:00.000Z",
          },
        ],
      });
      mockGetUserNotes.mockResolvedValue({
        success: true,
        data: [
          {
            id: "note-1",
            category: ".archive",
            title: "Newer Note",
            updatedAt: "2024-01-10T00:00:00.000Z",
          },
        ],
      });

      const result = await getArchivedItems();

      expect(result.success).toBe(true);
      expect(result.data?.[0].title).toBe("Newer Note");
      expect(result.data?.[1].title).toBe("Older List");
    });

    it("should include isShared flag in archived items", async () => {
      mockGetUserChecklists.mockResolvedValue({
        success: true,
        data: [
          {
            id: "list-1",
            category: ".archive",
            title: "Shared Archived List",
            isShared: true,
            updatedAt: "2024-01-01T00:00:00.000Z",
          },
        ],
      });
      mockGetUserNotes.mockResolvedValue({ success: true, data: [] });

      const result = await getArchivedItems();

      expect(result.success).toBe(true);
      expect(result.data?.[0].isShared).toBe(true);
    });

    it("should include full item data in archived items", async () => {
      const fullChecklist = {
        id: "list-1",
        category: ".archive",
        title: "Full Archived List",
        owner: "testuser",
        items: [{ id: "item-1", text: "Item", completed: false }],
        updatedAt: "2024-01-01T00:00:00.000Z",
      };
      mockGetUserChecklists.mockResolvedValue({
        success: true,
        data: [fullChecklist],
      });
      mockGetUserNotes.mockResolvedValue({ success: true, data: [] });

      const result = await getArchivedItems();

      expect(result.success).toBe(true);
      expect(result.data?.[0].data).toEqual(fullChecklist);
    });

    it("should handle errors gracefully", async () => {
      mockGetUserChecklists.mockRejectedValue(new Error("Fetch error"));

      const result = await getArchivedItems();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to fetch archived items");
    });
  });
});
