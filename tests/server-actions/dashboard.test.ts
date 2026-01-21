import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetAllMocks } from "../setup";

const mockGetCurrentUser = vi.fn();
const mockReadJsonFile = vi.fn();
const mockWriteJsonFile = vi.fn();
const mockUpdateList = vi.fn();
const mockUpdateNote = vi.fn();

vi.mock("@/app/_server/actions/users", () => ({
  getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
}));

vi.mock("@/app/_server/actions/file", () => ({
  readJsonFile: (...args: any[]) => mockReadJsonFile(...args),
  writeJsonFile: (...args: any[]) => mockWriteJsonFile(...args),
}));

vi.mock("@/app/_server/actions/checklist", () => ({
  updateList: (...args: any[]) => mockUpdateList(...args),
}));

vi.mock("@/app/_server/actions/note", () => ({
  updateNote: (...args: any[]) => mockUpdateNote(...args),
}));

import {
  togglePin,
  updatePinnedOrder,
  toggleArchive,
} from "@/app/_server/actions/dashboard";
import { ItemTypes, Modes } from "@/app/_types/enums";

describe("Dashboard Actions", () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetCurrentUser.mockResolvedValue({ username: "testuser" });
    mockReadJsonFile.mockResolvedValue([
      { username: "testuser", pinnedLists: [], pinnedNotes: [] },
    ]);
    mockWriteJsonFile.mockResolvedValue(undefined);
    mockUpdateList.mockResolvedValue({ success: true, data: {} });
    mockUpdateNote.mockResolvedValue({ success: true, data: {} });
  });

  describe("togglePin", () => {
    it("should return error when not authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const result = await togglePin(
        "list-1",
        "TestCategory",
        ItemTypes.CHECKLIST,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("should pin a checklist", async () => {
      mockReadJsonFile.mockResolvedValue([
        { username: "testuser", pinnedLists: [] },
      ]);

      const result = await togglePin(
        "list-1",
        "TestCategory",
        ItemTypes.CHECKLIST,
      );

      expect(result.success).toBe(true);
      expect(mockWriteJsonFile).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            username: "testuser",
            pinnedLists: ["TestCategory/list-1"],
          }),
        ]),
        expect.any(String),
      );
    });

    it("should unpin a checklist that is already pinned", async () => {
      mockReadJsonFile.mockResolvedValue([
        { username: "testuser", pinnedLists: ["TestCategory/list-1"] },
      ]);

      const result = await togglePin(
        "list-1",
        "TestCategory",
        ItemTypes.CHECKLIST,
      );

      expect(result.success).toBe(true);
      expect(mockWriteJsonFile).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            username: "testuser",
            pinnedLists: [],
          }),
        ]),
        expect.any(String),
      );
    });

    it("should pin a note", async () => {
      mockReadJsonFile.mockResolvedValue([
        { username: "testuser", pinnedNotes: [] },
      ]);

      const result = await togglePin("note-1", "TestCategory", ItemTypes.NOTE);

      expect(result.success).toBe(true);
      expect(mockWriteJsonFile).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            username: "testuser",
            pinnedNotes: ["TestCategory/note-1"],
          }),
        ]),
        expect.any(String),
      );
    });

    it("should unpin a note that is already pinned", async () => {
      mockReadJsonFile.mockResolvedValue([
        { username: "testuser", pinnedNotes: ["TestCategory/note-1"] },
      ]);

      const result = await togglePin("note-1", "TestCategory", ItemTypes.NOTE);

      expect(result.success).toBe(true);
      expect(mockWriteJsonFile).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            username: "testuser",
            pinnedNotes: [],
          }),
        ]),
        expect.any(String),
      );
    });

    it("should handle errors gracefully", async () => {
      mockReadJsonFile.mockRejectedValue(new Error("Read error"));

      const result = await togglePin(
        "list-1",
        "TestCategory",
        ItemTypes.CHECKLIST,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to toggle pin");
    });
  });

  describe("updatePinnedOrder", () => {
    it("should return error when not authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const result = await updatePinnedOrder(
        ["list-1", "list-2"],
        ItemTypes.CHECKLIST,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("should update pinned checklist order", async () => {
      mockReadJsonFile.mockResolvedValue([
        { username: "testuser", pinnedLists: ["list-2", "list-1"] },
      ]);

      const result = await updatePinnedOrder(
        ["list-1", "list-2"],
        ItemTypes.CHECKLIST,
      );

      expect(result.success).toBe(true);
      expect(mockWriteJsonFile).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            username: "testuser",
            pinnedLists: ["list-1", "list-2"],
          }),
        ]),
        expect.any(String),
      );
    });

    it("should update pinned note order", async () => {
      mockReadJsonFile.mockResolvedValue([
        { username: "testuser", pinnedNotes: ["note-2", "note-1"] },
      ]);

      const result = await updatePinnedOrder(
        ["note-1", "note-2"],
        ItemTypes.NOTE,
      );

      expect(result.success).toBe(true);
      expect(mockWriteJsonFile).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            username: "testuser",
            pinnedNotes: ["note-1", "note-2"],
          }),
        ]),
        expect.any(String),
      );
    });

    it("should handle errors gracefully", async () => {
      mockWriteJsonFile.mockRejectedValue(new Error("Write error"));

      const result = await updatePinnedOrder(["list-1"], ItemTypes.CHECKLIST);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to update pinned order");
    });
  });

  describe("toggleArchive", () => {
    it("should archive a checklist", async () => {
      mockGetCurrentUser.mockResolvedValue({ username: "testuser" });

      const checklist = {
        id: "list-1",
        title: "Test List",
        category: "TestCategory",
        owner: "testuser",
        items: [],
      };

      await toggleArchive(checklist as any, Modes.CHECKLISTS);

      expect(mockUpdateList).toHaveBeenCalled();
    });

    it("should archive a note", async () => {
      mockGetCurrentUser.mockResolvedValue({ username: "testuser" });

      const note = {
        id: "note-1",
        title: "Test Note",
        content: "Test content",
        category: "TestCategory",
        owner: "testuser",
      };

      await toggleArchive(note as any, Modes.NOTES);

      expect(mockUpdateNote).toHaveBeenCalled();
    });

    it("should return success when update succeeds", async () => {
      mockGetCurrentUser.mockResolvedValue({ username: "testuser" });
      mockUpdateList.mockResolvedValue({
        success: true,
        data: { id: "list-1" },
      });

      const checklist = {
        id: "list-1",
        title: "Test List",
        category: "TestCategory",
        owner: "testuser",
        items: [],
      };

      const result = await toggleArchive(checklist as any, Modes.CHECKLISTS);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it("should return error when update fails", async () => {
      mockGetCurrentUser.mockResolvedValue({ username: "testuser" });
      mockUpdateNote.mockResolvedValue({
        success: false,
        error: "Update failed",
      });

      const note = {
        id: "note-1",
        title: "Test Note",
        content: "Test content",
        category: "TestCategory",
        owner: "testuser",
      };

      const result = await toggleArchive(note as any, Modes.NOTES);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Update failed");
    });

    it("should restore to specified category", async () => {
      mockGetCurrentUser.mockResolvedValue({ username: "testuser" });

      const checklist = {
        id: "list-1",
        title: "Test List",
        category: "_Archived",
        owner: "testuser",
        items: [],
      };

      await toggleArchive(
        checklist as any,
        Modes.CHECKLISTS,
        "OriginalCategory",
      );

      const formDataCall = mockUpdateList.mock.calls[0][0];
      expect(formDataCall.get("category")).toBe("OriginalCategory");
    });
  });
});
