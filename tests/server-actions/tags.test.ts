import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockFs, resetAllMocks } from "../setup";

const mockExportWholeDataFolder = vi.fn();
const mockExtractYamlMetadata = vi.fn();
const mockUpdateYamlMetadata = vi.fn();
const mockExtractHashtagsFromContent = vi.fn();

vi.mock("@/app/_server/actions/export", () => ({
  exportWholeDataFolder: (...args: any[]) => mockExportWholeDataFolder(...args),
}));

vi.mock("@/app/_utils/yaml-metadata-utils", () => ({
  extractYamlMetadata: (...args: any[]) => mockExtractYamlMetadata(...args),
  updateYamlMetadata: (...args: any[]) => mockUpdateYamlMetadata(...args),
}));

vi.mock("@/app/_utils/tag-utils", () => ({
  extractHashtagsFromContent: (...args: any[]) =>
    mockExtractHashtagsFromContent(...args),
}));

import { updateTagsFromContent } from "@/app/_server/actions/tags";

describe("Tags Server Actions", () => {
  beforeEach(() => {
    resetAllMocks();
    mockExportWholeDataFolder.mockResolvedValue({ success: true });
    mockExtractYamlMetadata.mockReturnValue({
      metadata: { uuid: "test-uuid", tags: [] },
      contentWithoutMetadata: "Test content",
    });
    mockUpdateYamlMetadata.mockReturnValue(
      "---\nuuid: test-uuid\ntags:\n  - newtag\n---\nTest content"
    );
    mockExtractHashtagsFromContent.mockReturnValue(["newtag"]);
  });

  describe("updateTagsFromContent", () => {
    it("should backup data before processing", async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([]);

      await updateTagsFromContent();

      expect(mockExportWholeDataFolder).toHaveBeenCalled();
    });

    it("should return error if backup fails", async () => {
      mockExportWholeDataFolder.mockResolvedValue({
        success: false,
        error: "Backup failed",
      });

      const result = await updateTagsFromContent();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to backup data");
    });

    it("should return error if notes directory not found", async () => {
      mockFs.access.mockRejectedValue(new Error("ENOENT"));

      const result = await updateTagsFromContent();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Notes directory not found");
    });

    it("should process markdown files recursively", async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockImplementation(async (dirPath: string) => {
        if (dirPath.endsWith("notes")) {
          return [
            { name: "user1", isDirectory: () => true, isFile: () => false },
          ];
        }
        if (dirPath.endsWith("user1")) {
          return [
            { name: "note1.md", isDirectory: () => false, isFile: () => true },
          ];
        }
        return [];
      });
      mockFs.readFile.mockResolvedValue("---\nuuid: test\n---\n#newtag content");
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await updateTagsFromContent();

      expect(result.success).toBe(true);
      expect(result.data?.processed).toBe(1);
    });

    it("should merge existing tags with extracted tags", async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockImplementation(async (dirPath: string) => {
        if (dirPath.endsWith("notes")) {
          return [
            { name: "user1", isDirectory: () => true, isFile: () => false },
          ];
        }
        if (dirPath.endsWith("user1")) {
          return [
            { name: "note1.md", isDirectory: () => false, isFile: () => true },
          ];
        }
        return [];
      });
      mockFs.readFile.mockResolvedValue(
        "---\nuuid: test\ntags:\n  - existing\n---\n#newtag content"
      );
      mockFs.writeFile.mockResolvedValue(undefined);
      mockExtractYamlMetadata.mockReturnValue({
        metadata: { uuid: "test-uuid", tags: ["existing"] },
        contentWithoutMetadata: "#newtag content",
      });
      mockExtractHashtagsFromContent.mockReturnValue(["newtag"]);

      await updateTagsFromContent();

      expect(mockUpdateYamlMetadata).toHaveBeenCalledWith(
        expect.any(String),
        { tags: expect.arrayContaining(["existing", "newtag"]) },
        true
      );
    });

    it("should skip files when no tags change", async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockImplementation(async (dirPath: string) => {
        if (dirPath.endsWith("notes")) {
          return [
            { name: "user1", isDirectory: () => true, isFile: () => false },
          ];
        }
        if (dirPath.endsWith("user1")) {
          return [
            { name: "note1.md", isDirectory: () => false, isFile: () => true },
          ];
        }
        return [];
      });
      mockFs.readFile.mockResolvedValue(
        "---\nuuid: test\ntags:\n  - existing\n---\nNo new tags"
      );
      mockExtractYamlMetadata.mockReturnValue({
        metadata: { uuid: "test-uuid", tags: ["existing"] },
        contentWithoutMetadata: "No new tags",
      });
      mockExtractHashtagsFromContent.mockReturnValue(["existing"]);

      const result = await updateTagsFromContent();

      expect(result.success).toBe(true);
      expect(result.data?.updated).toBe(0);
    });

    it("should skip temp_exports directory", async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockImplementation(async (dirPath: string) => {
        if (dirPath.endsWith("notes")) {
          return [
            { name: "temp_exports", isDirectory: () => true, isFile: () => false },
            { name: "user1", isDirectory: () => true, isFile: () => false },
          ];
        }
        if (dirPath.endsWith("user1")) {
          return [
            { name: "note1.md", isDirectory: () => false, isFile: () => true },
          ];
        }
        return [];
      });
      mockFs.readFile.mockResolvedValue("---\nuuid: test\n---\n#tag content");
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await updateTagsFromContent();

      expect(result.success).toBe(true);
      expect(result.data?.processed).toBe(1);
    });

    it("should skip backups directory", async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockImplementation(async (dirPath: string) => {
        if (dirPath.endsWith("notes")) {
          return [
            { name: "backups", isDirectory: () => true, isFile: () => false },
            { name: "user1", isDirectory: () => true, isFile: () => false },
          ];
        }
        if (dirPath.endsWith("user1")) {
          return [
            { name: "note1.md", isDirectory: () => false, isFile: () => true },
          ];
        }
        return [];
      });
      mockFs.readFile.mockResolvedValue("---\nuuid: test\n---\n#tag content");
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await updateTagsFromContent();

      expect(result.success).toBe(true);
    });

    it("should sort merged tags alphabetically", async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockImplementation(async (dirPath: string) => {
        if (dirPath.endsWith("notes")) {
          return [
            { name: "user1", isDirectory: () => true, isFile: () => false },
          ];
        }
        if (dirPath.endsWith("user1")) {
          return [
            { name: "note1.md", isDirectory: () => false, isFile: () => true },
          ];
        }
        return [];
      });
      mockFs.readFile.mockResolvedValue(
        "---\nuuid: test\ntags:\n  - zebra\n---\n#alpha content"
      );
      mockFs.writeFile.mockResolvedValue(undefined);
      mockExtractYamlMetadata.mockReturnValue({
        metadata: { uuid: "test-uuid", tags: ["zebra"] },
        contentWithoutMetadata: "#alpha content",
      });
      mockExtractHashtagsFromContent.mockReturnValue(["alpha"]);

      await updateTagsFromContent();

      expect(mockUpdateYamlMetadata).toHaveBeenCalledWith(
        expect.any(String),
        { tags: ["alpha", "zebra"] },
        true
      );
    });

    it("should handle file read errors gracefully", async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockImplementation(async (dirPath: string) => {
        if (dirPath.endsWith("notes")) {
          return [
            { name: "user1", isDirectory: () => true, isFile: () => false },
          ];
        }
        if (dirPath.endsWith("user1")) {
          return [
            { name: "note1.md", isDirectory: () => false, isFile: () => true },
            { name: "note2.md", isDirectory: () => false, isFile: () => true },
          ];
        }
        return [];
      });
      mockFs.readFile
        .mockRejectedValueOnce(new Error("Read error"))
        .mockResolvedValueOnce("---\nuuid: test\n---\n#tag content");
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await updateTagsFromContent();

      expect(result.success).toBe(true);
      const hasFailedMessage = result.data?.changes.some(
        (change: string) => change.includes("Failed to process")
      );
      expect(hasFailedMessage).toBe(true);
    });

    it("should return changes log", async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([]);

      const result = await updateTagsFromContent();

      expect(result.success).toBe(true);
      expect(result.data?.changes).toContain("Starting data backup...");
      expect(result.data?.changes).toContain("Data backup completed successfully");
    });

    it("should not write file if no new tags found and no existing tags", async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockImplementation(async (dirPath: string) => {
        if (dirPath.endsWith("notes")) {
          return [
            { name: "user1", isDirectory: () => true, isFile: () => false },
          ];
        }
        if (dirPath.endsWith("user1")) {
          return [
            { name: "note1.md", isDirectory: () => false, isFile: () => true },
          ];
        }
        return [];
      });
      mockFs.readFile.mockResolvedValue("---\nuuid: test\n---\nContent without tags");
      mockExtractYamlMetadata.mockReturnValue({
        metadata: { uuid: "test-uuid", tags: [] },
        contentWithoutMetadata: "Content without tags",
      });
      mockExtractHashtagsFromContent.mockReturnValue([]);

      const result = await updateTagsFromContent();

      expect(result.success).toBe(true);
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });

    it("should count processed and updated files correctly", async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockImplementation(async (dirPath: string) => {
        if (dirPath.endsWith("notes")) {
          return [
            { name: "user1", isDirectory: () => true, isFile: () => false },
          ];
        }
        if (dirPath.endsWith("user1")) {
          return [
            { name: "note1.md", isDirectory: () => false, isFile: () => true },
            { name: "note2.md", isDirectory: () => false, isFile: () => true },
            { name: "note3.md", isDirectory: () => false, isFile: () => true },
          ];
        }
        return [];
      });

      let callCount = 0;
      mockFs.readFile.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return "---\nuuid: test1\n---\n#newtag content";
        }
        if (callCount === 2) {
          return "---\nuuid: test2\ntags:\n  - existing\n---\nNo new tags";
        }
        return "---\nuuid: test3\n---\n#anothertag";
      });

      let extractCallCount = 0;
      mockExtractYamlMetadata.mockImplementation((content: string) => {
        extractCallCount++;
        if (extractCallCount === 1) {
          return { metadata: { uuid: "test1", tags: [] }, contentWithoutMetadata: "#newtag content" };
        }
        if (extractCallCount === 2) {
          return { metadata: { uuid: "test2", tags: ["existing"] }, contentWithoutMetadata: "No new tags" };
        }
        return { metadata: { uuid: "test3", tags: [] }, contentWithoutMetadata: "#anothertag" };
      });

      let hashtagCallCount = 0;
      mockExtractHashtagsFromContent.mockImplementation(() => {
        hashtagCallCount++;
        if (hashtagCallCount === 1) return ["newtag"];
        if (hashtagCallCount === 2) return ["existing"];
        return ["anothertag"];
      });

      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await updateTagsFromContent();

      expect(result.success).toBe(true);
      expect(result.data?.processed).toBe(3);
      expect(result.data?.updated).toBe(2);
    });
  });
});
