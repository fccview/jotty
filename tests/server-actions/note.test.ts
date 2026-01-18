import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  mockFs,
  mockRevalidatePath,
  resetAllMocks,
  createFormData,
} from "../setup";

const mockGetUserModeDir = vi.fn();
const mockEnsureDir = vi.fn();
const mockServerWriteFile = vi.fn();
const mockServerDeleteFile = vi.fn();
const mockServerReadDir = vi.fn();
const mockServerReadFile = vi.fn();
const mockReadOrderFile = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockGetUsername = vi.fn();
const mockCheckUserPermission = vi.fn();
const mockLogContentEvent = vi.fn();
const mockParseInternalLinks = vi.fn();
const mockUpdateIndexForItem = vi.fn();
const mockRemoveItemFromIndex = vi.fn();
const mockCommitNote = vi.fn();
const mockGetSettings = vi.fn();

vi.mock("@/app/_server/actions/file", () => ({
  getUserModeDir: (...args: any[]) => mockGetUserModeDir(...args),
  ensureDir: (...args: any[]) => mockEnsureDir(...args),
  serverWriteFile: (...args: any[]) => mockServerWriteFile(...args),
  serverDeleteFile: (...args: any[]) => mockServerDeleteFile(...args),
  serverReadDir: (...args: any[]) => mockServerReadDir(...args),
  serverReadFile: (...args: any[]) => mockServerReadFile(...args),
  readOrderFile: (...args: any[]) => mockReadOrderFile(...args),
  readJsonFile: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/app/_server/actions/users", () => ({
  getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
  getUsername: (...args: any[]) => mockGetUsername(...args),
  getUserByNote: vi.fn().mockResolvedValue({ success: false }),
  getUserByNoteUuid: vi.fn().mockResolvedValue({ success: false }),
  getUserByUsername: vi.fn().mockResolvedValue(null),
  isAuthenticated: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/app/_server/actions/sharing", () => ({
  checkUserPermission: (...args: any[]) => mockCheckUserPermission(...args),
  getAllSharedItemsForUser: vi
    .fn()
    .mockResolvedValue({ notes: [], checklists: [] }),
  updateSharingData: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/app/_server/actions/log", () => ({
  logContentEvent: (...args: any[]) => mockLogContentEvent(...args),
}));

vi.mock("@/app/_server/actions/link", () => ({
  parseInternalLinks: (...args: any[]) => mockParseInternalLinks(...args),
  updateIndexForItem: (...args: any[]) => mockUpdateIndexForItem(...args),
  removeItemFromIndex: (...args: any[]) => mockRemoveItemFromIndex(...args),
  rebuildLinkIndex: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/app/_server/actions/history", () => ({
  commitNote: (...args: any[]) => mockCommitNote(...args),
}));

vi.mock("@/app/_server/actions/config", () => ({
  getSettings: (...args: any[]) => mockGetSettings(...args),
}));

vi.mock("@/app/_utils/filename-utils", () => ({
  generateUniqueFilename: vi.fn().mockResolvedValue("test-note.md"),
  sanitizeFilename: vi.fn().mockReturnValue("test-note"),
}));

vi.mock("@/app/_utils/yaml-metadata-utils", () => ({
  generateUuid: vi.fn().mockReturnValue("test-uuid-123"),
  generateYamlFrontmatter: vi
    .fn()
    .mockReturnValue("---\nuuid: test-uuid-123\n---\n"),
  extractYamlMetadata: vi.fn().mockReturnValue({
    metadata: { uuid: "test-uuid-123" },
    contentWithoutMetadata: "Test content",
  }),
  updateYamlMetadata: vi
    .fn()
    .mockReturnValue("---\nuuid: test-uuid-123\n---\nTest content"),
  extractTitle: vi.fn().mockReturnValue("Test Note"),
}));

vi.mock("@/app/_utils/markdown-utils", () => ({
  sanitizeMarkdown: vi.fn().mockImplementation((content) => content),
}));

vi.mock("@/app/_utils/encryption-utils", () => ({
  isEncrypted: vi.fn().mockReturnValue(false),
  detectEncryptionMethod: vi.fn().mockReturnValue(null),
}));

import { createNote, deleteNote } from "@/app/_server/actions/note";

describe("Note Actions", () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetUserModeDir.mockResolvedValue("/data/notes/testuser");
    mockEnsureDir.mockResolvedValue(undefined);
    mockServerWriteFile.mockResolvedValue(undefined);
    mockServerDeleteFile.mockResolvedValue(undefined);
    mockServerReadDir.mockResolvedValue([]);
    mockServerReadFile.mockResolvedValue("");
    mockReadOrderFile.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue({
      username: "testuser",
      fileRenameMode: "minimal",
    });
    mockGetUsername.mockResolvedValue("testuser");
    mockCheckUserPermission.mockResolvedValue(true);
    mockLogContentEvent.mockResolvedValue(undefined);
    mockParseInternalLinks.mockResolvedValue([]);
    mockUpdateIndexForItem.mockResolvedValue(undefined);
    mockRemoveItemFromIndex.mockResolvedValue(undefined);
    mockCommitNote.mockResolvedValue(undefined);
    mockGetSettings.mockResolvedValue({});
  });

  describe("createNote", () => {
    it("should create a new note successfully", async () => {
      const formData = createFormData({
        title: "My New Note",
        category: "TestCategory",
        rawContent: "# My New Note\n\nThis is content.",
      });

      const result = await createNote(formData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.title).toBe("My New Note");
      expect(result.data?.category).toBe("TestCategory");
      expect(mockEnsureDir).toHaveBeenCalled();
      expect(mockServerWriteFile).toHaveBeenCalled();
    });

    it("should return error when not authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const formData = createFormData({
        title: "Unauthenticated Note",
        category: "TestCategory",
        rawContent: "Content",
      });

      const result = await createNote(formData);

      expect(result.error).toBe("Not authenticated");
    });

    it("should log content event on creation", async () => {
      const formData = createFormData({
        title: "Logged Note",
        category: "TestCategory",
        rawContent: "Content",
      });

      await createNote(formData);

      expect(mockLogContentEvent).toHaveBeenCalledWith(
        "note_created",
        "note",
        expect.any(String),
        "Logged Note",
        true,
        expect.objectContaining({ category: "TestCategory" }),
      );
    });

    it("should update link index after creation", async () => {
      const formData = createFormData({
        title: "Linked Note",
        category: "TestCategory",
        rawContent: "Content with [[link]]",
      });

      await createNote(formData);

      expect(mockUpdateIndexForItem).toHaveBeenCalled();
    });

    it("should commit note to history", async () => {
      const formData = createFormData({
        title: "Versioned Note",
        category: "TestCategory",
        rawContent: "Content",
      });

      await createNote(formData);

      expect(mockCommitNote).toHaveBeenCalledWith(
        "testuser",
        expect.stringContaining("TestCategory"),
        "create",
        "Versioned Note",
      );
    });

    it("should handle creation errors gracefully", async () => {
      mockServerWriteFile.mockRejectedValue(new Error("Write failed"));

      const formData = createFormData({
        title: "Failed Note",
        category: "TestCategory",
        rawContent: "Content",
      });

      const result = await createNote(formData);

      expect(result.error).toBe("Failed to create note");
    });

    it("should use user from formData when provided", async () => {
      const formData = createFormData({
        title: "API Note",
        category: "TestCategory",
        rawContent: "Content",
        user: JSON.stringify({
          username: "apiuser",
          fileRenameMode: "minimal",
        }),
      });

      const result = await createNote(formData);

      expect(result.success).toBe(true);
      expect(result.data?.owner).toBe("apiuser");
    });
  });

  describe("deleteNote", () => {
    beforeEach(() => {
      vi.doMock("@/app/_server/actions/note", async (importOriginal) => {
        const original = (await importOriginal()) as any;
        return {
          ...original,
          getNoteById: vi.fn().mockResolvedValue({
            id: "test-note",
            uuid: "test-uuid-123",
            title: "Test Note",
            category: "TestCategory",
            owner: "testuser",
            content: "Test content",
          }),
          getUserNotes: vi.fn().mockResolvedValue({
            success: true,
            data: [
              {
                id: "test-note",
                uuid: "test-uuid-123",
                title: "Test Note",
                category: "TestCategory",
                owner: "testuser",
                content: "Test content",
              },
            ],
          }),
        };
      });
    });

    it("should return error when not authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const formData = createFormData({
        id: "test-note",
        category: "TestCategory",
      });

      const result = await deleteNote(formData);

      expect(result.error).toBe("Not authenticated");
    });

    it("should return error when permission denied", async () => {
      mockCheckUserPermission.mockResolvedValue(false);

      const formData = createFormData({
        id: "test-note",
        category: "TestCategory",
      });

      const result = await deleteNote(formData);

      expect(result.error).toBeDefined();
    });
  });
});
