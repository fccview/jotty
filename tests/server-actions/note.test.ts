import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  resetAllMocks,
  createFormData,
  mockFs,
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
const mockExtractHashtagsFromContent = vi.fn();
const mockGenerateYamlFrontmatter = vi.fn();
const mockExtractYamlMetadata = vi.fn();
const mockExtractTitle = vi.fn();
const mockGetUserByNote = vi.fn();
const mockGetUserByNoteUuid = vi.fn();

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
  getUserByNote: (...args: any[]) => mockGetUserByNote(...args),
  getUserByNoteUuid: (...args: any[]) => mockGetUserByNoteUuid(...args),
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
  generateYamlFrontmatter: (...args: any[]) => mockGenerateYamlFrontmatter(...args),
  extractYamlMetadata: (...args: any[]) => mockExtractYamlMetadata(...args),
  updateYamlMetadata: vi
    .fn()
    .mockReturnValue("---\nuuid: test-uuid-123\n---\nTest content"),
  extractTitle: (...args: any[]) => mockExtractTitle(...args),
}));

vi.mock("@/app/_utils/markdown-utils", () => ({
  sanitizeMarkdown: vi.fn().mockImplementation((content) => content),
}));

vi.mock("@/app/_utils/tag-utils", () => ({
  extractHashtagsFromContent: (...args: any[]) =>
    mockExtractHashtagsFromContent(...args),
}));

vi.mock("@/app/_utils/encryption-utils", () => ({
  isEncrypted: vi.fn().mockReturnValue(false),
  detectEncryptionMethod: vi.fn().mockReturnValue(null),
}));

import { createNote, deleteNote, updateNote } from "@/app/_server/actions/note";

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
    mockExtractHashtagsFromContent.mockReturnValue([]);
    mockGenerateYamlFrontmatter.mockReturnValue("---\nuuid: test-uuid-123\n---\n");
    mockExtractYamlMetadata.mockReturnValue({
      metadata: { uuid: "test-uuid-123" },
      contentWithoutMetadata: "Test content",
    });
    mockExtractTitle.mockReturnValue("Test Note");
    mockGetUserByNote.mockResolvedValue({ success: false });
    mockGetUserByNoteUuid.mockResolvedValue({ success: false });
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

  describe("Tags in Notes", () => {
    describe("createNote with tags", () => {
      it("should extract hashtags from content when creating note", async () => {
        mockExtractHashtagsFromContent.mockReturnValue(["work", "project"]);

        const formData = createFormData({
          title: "Tagged Note",
          category: "TestCategory",
          rawContent: "Content with #work and #project tags",
        });

        const result = await createNote(formData);

        expect(result.success).toBe(true);
        expect(mockExtractHashtagsFromContent).toHaveBeenCalled();
      });

      it("should include extracted tags in note data", async () => {
        mockExtractHashtagsFromContent.mockReturnValue(["important", "todo"]);

        const formData = createFormData({
          title: "Multi-Tag Note",
          category: "TestCategory",
          rawContent: "Content with #important #todo",
        });

        const result = await createNote(formData);

        expect(result.success).toBe(true);
        expect(result.data?.tags).toEqual(["important", "todo"]);
      });

      it("should not include tags property when no tags extracted", async () => {
        mockExtractHashtagsFromContent.mockReturnValue([]);

        const formData = createFormData({
          title: "No Tags Note",
          category: "TestCategory",
          rawContent: "Content without any tags",
        });

        const result = await createNote(formData);

        expect(result.success).toBe(true);
        expect(result.data?.tags).toBeUndefined();
      });

      it("should write tags to frontmatter", async () => {
        mockExtractHashtagsFromContent.mockReturnValue(["work"]);
        mockGenerateYamlFrontmatter.mockImplementation((metadata) => {
          const lines = ["---"];
          if (metadata.uuid) lines.push(`uuid: ${metadata.uuid}`);
          if (metadata.title) lines.push(`title: ${metadata.title}`);
          if (metadata.tags && metadata.tags.length > 0) {
            lines.push("tags:");
            metadata.tags.forEach((tag: string) => lines.push(`  - ${tag}`));
          }
          lines.push("---\n");
          return lines.join("\n");
        });

        const formData = createFormData({
          title: "Frontmatter Tags Note",
          category: "TestCategory",
          rawContent: "Content with #work",
        });

        await createNote(formData);

        expect(mockGenerateYamlFrontmatter).toHaveBeenCalledWith(
          expect.objectContaining({
            tags: ["work"],
          })
        );
      });

      it("should extract nested hashtags", async () => {
        mockExtractHashtagsFromContent.mockReturnValue(["work/project", "personal/health"]);

        const formData = createFormData({
          title: "Nested Tags Note",
          category: "TestCategory",
          rawContent: "Content with #work/project and #personal/health",
        });

        const result = await createNote(formData);

        expect(result.success).toBe(true);
        expect(result.data?.tags).toContain("work/project");
        expect(result.data?.tags).toContain("personal/health");
      });
    });

    describe("updateNote with tags", () => {
      const setupUpdateNoteMocks = () => {
        mockGetUserByNoteUuid.mockResolvedValue({
          success: true,
          data: { username: "testuser" },
        });

        mockServerReadDir.mockImplementation(async (dirPath: string) => {
          if (dirPath.includes("TestCategory")) {
            return [
              {
                name: "test-note.md",
                isFile: () => true,
                isDirectory: () => false,
              },
            ];
          }
          if (dirPath.includes("testuser")) {
            return [
              {
                name: "TestCategory",
                isFile: () => false,
                isDirectory: () => true,
              },
            ];
          }
          return [];
        });

        const storedContent = `---\nuuid: test-uuid-123\ntitle: Test Note\n---\nExisting content`;
        mockServerReadFile.mockResolvedValue(storedContent);

        mockFs.stat.mockResolvedValue({
          birthtime: new Date("2024-01-01"),
          mtime: new Date("2024-01-02"),
        });

        mockExtractYamlMetadata.mockReturnValue({
          metadata: { uuid: "test-uuid-123", title: "Test Note" },
          contentWithoutMetadata: "Existing content",
        });

        mockExtractTitle.mockReturnValue("Test Note");
      };

      it("should extract tags from updated content", async () => {
        setupUpdateNoteMocks();
        mockExtractHashtagsFromContent.mockReturnValue(["work", "project"]);

        const formData = createFormData({
          id: "test-note",
          uuid: "test-uuid-123",
          title: "Test Note",
          content: "Content with #work and #project",
          category: "TestCategory",
          originalCategory: "TestCategory",
        });

        const result = await updateNote(formData);

        expect(result.success).toBe(true);
        expect(mockExtractHashtagsFromContent).toHaveBeenCalled();
        expect(result.data?.tags).toContain("work");
        expect(result.data?.tags).toContain("project");
      });

      it("should sort extracted tags alphabetically", async () => {
        setupUpdateNoteMocks();
        mockExtractHashtagsFromContent.mockReturnValue(["zebra", "alpha", "middle"]);

        const formData = createFormData({
          id: "test-note",
          uuid: "test-uuid-123",
          title: "Test Note",
          content: "Content with #zebra #alpha #middle",
          category: "TestCategory",
          originalCategory: "TestCategory",
        });

        const result = await updateNote(formData);

        expect(result.success).toBe(true);
        expect(result.data?.tags).toEqual(["alpha", "middle", "zebra"]);
      });

      it("should remove tags when removed from content", async () => {
        setupUpdateNoteMocks();
        mockExtractHashtagsFromContent.mockReturnValue([]);

        const formData = createFormData({
          id: "test-note",
          uuid: "test-uuid-123",
          title: "Test Note",
          content: "Content without any tags now",
          category: "TestCategory",
          originalCategory: "TestCategory",
        });

        const result = await updateNote(formData);

        expect(result.success).toBe(true);
        expect(result.data?.tags).toBeUndefined();
      });

      it("should extract nested hashtags", async () => {
        setupUpdateNoteMocks();
        mockExtractHashtagsFromContent.mockReturnValue(["work/project", "personal/health"]);

        const formData = createFormData({
          id: "test-note",
          uuid: "test-uuid-123",
          title: "Test Note",
          content: "Content with #work/project and #personal/health",
          category: "TestCategory",
          originalCategory: "TestCategory",
        });

        const result = await updateNote(formData);

        expect(result.success).toBe(true);
        expect(result.data?.tags).toContain("work/project");
        expect(result.data?.tags).toContain("personal/health");
      });

      it("should deduplicate tags in content", async () => {
        setupUpdateNoteMocks();
        mockExtractHashtagsFromContent.mockReturnValue(["duplicate"]);

        const formData = createFormData({
          id: "test-note",
          uuid: "test-uuid-123",
          title: "Test Note",
          content: "Content with #duplicate mentioned twice",
          category: "TestCategory",
          originalCategory: "TestCategory",
        });

        const result = await updateNote(formData);

        expect(result.success).toBe(true);
        expect(result.data?.tags).toHaveLength(1);
        expect(result.data?.tags?.[0]).toBe("duplicate");
      });
    });

    describe("Frontmatter tag handling", () => {
      it("should include tags in generated frontmatter when saving", async () => {
        mockExtractHashtagsFromContent.mockReturnValue(["save-tag"]);
        mockGenerateYamlFrontmatter.mockImplementation((metadata) => {
          const lines = ["---"];
          Object.entries(metadata).forEach(([key, value]) => {
            if (key === "tags" && Array.isArray(value)) {
              lines.push("tags:");
              (value as string[]).forEach((tag) => lines.push(`  - ${tag}`));
            } else {
              lines.push(`${key}: ${value}`);
            }
          });
          lines.push("---\n");
          return lines.join("\n");
        });

        const formData = createFormData({
          title: "Save Tags Note",
          category: "TestCategory",
          rawContent: "Content with #save-tag",
        });

        await createNote(formData);

        expect(mockServerWriteFile).toHaveBeenCalled();
        expect(mockGenerateYamlFrontmatter).toHaveBeenCalledWith(
          expect.objectContaining({
            tags: ["save-tag"],
          })
        );
      });

      it("should write tags to YAML frontmatter format", async () => {
        mockExtractHashtagsFromContent.mockReturnValue(["alpha", "beta"]);
        let capturedFrontmatter = "";
        mockGenerateYamlFrontmatter.mockImplementation((metadata) => {
          const lines = ["---"];
          Object.entries(metadata).forEach(([key, value]) => {
            if (key === "tags" && Array.isArray(value)) {
              lines.push("tags:");
              (value as string[]).forEach((tag) => lines.push(`  - ${tag}`));
            } else if (value !== undefined) {
              lines.push(`${key}: ${value}`);
            }
          });
          lines.push("---\n");
          capturedFrontmatter = lines.join("\n");
          return capturedFrontmatter;
        });

        const formData = createFormData({
          title: "YAML Tags Note",
          category: "TestCategory",
          rawContent: "Content with #alpha #beta",
        });

        await createNote(formData);

        expect(capturedFrontmatter).toContain("tags:");
        expect(capturedFrontmatter).toContain("  - alpha");
        expect(capturedFrontmatter).toContain("  - beta");
      });

      it("should not include tags in frontmatter when no tags exist", async () => {
        mockExtractHashtagsFromContent.mockReturnValue([]);

        const formData = createFormData({
          title: "No Tags Note",
          category: "TestCategory",
          rawContent: "Content without any tags",
        });

        await createNote(formData);

        expect(mockGenerateYamlFrontmatter).toHaveBeenCalledWith(
          expect.not.objectContaining({
            tags: expect.anything(),
          })
        );
      });
    });
  });
});
