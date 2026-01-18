import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockFs, resetAllMocks } from "../setup";

const mockGetCurrentUser = vi.fn();

vi.mock("@/app/_server/actions/users", () => ({
  getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
}));

vi.mock("@/app/_server/actions/log", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

import {
  ensureDir,
  ensureFile,
  readJsonFile,
  writeJsonFile,
  readFile,
  getUserModeDir,
  serverReadFile,
  serverWriteFile,
  serverDeleteFile,
  serverReadDir,
  serverDeleteDir,
  readOrderFile,
  writeOrderFile,
} from "@/app/_server/actions/file";
import { Modes } from "@/app/_types/enums";

describe("File Actions", () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetCurrentUser.mockResolvedValue({ username: "testuser" });
    mockFs.access.mockReset();
    mockFs.mkdir.mockReset();
    mockFs.readFile.mockReset();
    mockFs.writeFile.mockReset();
    mockFs.unlink.mockReset();
    mockFs.readdir.mockReset();
    mockFs.rm.mockReset();
  });

  describe("ensureDir", () => {
    it("should not create directory if it exists", async () => {
      mockFs.access.mockResolvedValue(undefined);

      await ensureDir("/some/dir");

      expect(mockFs.access).toHaveBeenCalledWith("/some/dir");
      expect(mockFs.mkdir).not.toHaveBeenCalled();
    });

    it("should create directory if it does not exist", async () => {
      mockFs.access.mockRejectedValue(new Error("ENOENT"));
      mockFs.mkdir.mockResolvedValue(undefined);

      await ensureDir("/new/dir");

      expect(mockFs.mkdir).toHaveBeenCalledWith("/new/dir", {
        recursive: true,
      });
    });
  });

  describe("ensureFile", () => {
    it("should not create file if it exists", async () => {
      mockFs.access.mockResolvedValue(undefined);

      await ensureFile("/some/file.txt");

      expect(mockFs.access).toHaveBeenCalledWith("/some/file.txt");
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });

    it("should create empty file if it does not exist", async () => {
      mockFs.access.mockRejectedValue(new Error("ENOENT"));
      mockFs.writeFile.mockResolvedValue(undefined);

      await ensureFile("/new/file.txt");

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        "/new/file.txt",
        "",
        "utf-8",
      );
    });
  });

  describe("readJsonFile", () => {
    it("should return parsed JSON content", async () => {
      mockFs.readFile.mockResolvedValue('{"key": "value"}');

      const result = await readJsonFile("data/test.json");

      expect(result).toEqual({ key: "value" });
    });

    it("should return null on error", async () => {
      mockFs.readFile.mockRejectedValue(new Error("ENOENT"));

      const result = await readJsonFile("nonexistent.json");

      expect(result).toBeNull();
    });

    it("should return null for invalid JSON", async () => {
      mockFs.readFile.mockResolvedValue("invalid json");

      const result = await readJsonFile("invalid.json");

      expect(result).toBeNull();
    });
  });

  describe("writeJsonFile", () => {
    it("should write formatted JSON to file", async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const data = { key: "value", nested: { num: 123 } };
      await writeJsonFile(data, "data/output.json");

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("output.json"),
        JSON.stringify(data, null, 2),
        "utf-8",
      );
    });

    it("should ensure directory exists before writing", async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await writeJsonFile({}, "nested/path/file.json");

      expect(mockFs.mkdir).toHaveBeenCalled();
    });

    it("should throw on write error", async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockRejectedValue(new Error("Write failed"));

      await expect(writeJsonFile({}, "error.json")).rejects.toThrow(
        "Write failed",
      );
    });
  });

  describe("readFile", () => {
    it("should return file content", async () => {
      mockFs.readFile.mockResolvedValue("file content");

      const result = await readFile("test.txt");

      expect(result).toBe("file content");
    });

    it("should return empty string on error", async () => {
      mockFs.readFile.mockRejectedValue(new Error("ENOENT"));

      const result = await readFile("nonexistent.txt");

      expect(result).toBe("");
    });
  });

  describe("getUserModeDir", () => {
    it("should return path for provided username", async () => {
      const result = await getUserModeDir(Modes.NOTES, "specificuser");

      expect(result).toContain("notes");
      expect(result).toContain("specificuser");
    });

    it("should use current user when username not provided", async () => {
      mockGetCurrentUser.mockResolvedValue({ username: "currentuser" });

      const result = await getUserModeDir(Modes.CHECKLISTS);

      expect(result).toContain("checklists");
      expect(result).toContain("currentuser");
    });

    it("should throw when not authenticated and no username provided", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      await expect(getUserModeDir(Modes.NOTES)).rejects.toThrow(
        "Not authenticated",
      );
    });
  });

  describe("serverReadFile", () => {
    it("should return file content", async () => {
      mockFs.readFile.mockResolvedValue("server file content");

      const result = await serverReadFile("/absolute/path.txt");

      expect(result).toBe("server file content");
    });

    it("should return empty string on error", async () => {
      mockFs.readFile.mockRejectedValue(new Error("ENOENT"));

      const result = await serverReadFile("/nonexistent.txt");

      expect(result).toBe("");
    });

    it("should return custom value on error when provided", async () => {
      mockFs.readFile.mockRejectedValue(new Error("ENOENT"));

      const result = await serverReadFile("/nonexistent.txt", "default value");

      expect(result).toBe("default value");
    });
  });

  describe("serverWriteFile", () => {
    it("should ensure directory and write file", async () => {
      mockFs.access.mockRejectedValue(new Error("ENOENT"));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await serverWriteFile("/path/to/file.txt", "content");

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        "/path/to/file.txt",
        "content",
        "utf-8",
      );
    });
  });

  describe("serverDeleteFile", () => {
    it("should delete file", async () => {
      mockFs.unlink.mockResolvedValue(undefined);

      await serverDeleteFile("/path/to/file.txt");

      expect(mockFs.unlink).toHaveBeenCalledWith("/path/to/file.txt");
    });

    it("should log and not throw on error", async () => {
      mockFs.unlink.mockRejectedValue(new Error("ENOENT"));

      await expect(serverDeleteFile("/nonexistent.txt")).resolves.not.toThrow();
    });
  });

  describe("serverReadDir", () => {
    it("should return directory contents", async () => {
      const mockEntries = [
        { name: "file1.txt", isFile: () => true, isDirectory: () => false },
        { name: "subdir", isFile: () => false, isDirectory: () => true },
      ];
      mockFs.readdir.mockResolvedValue(mockEntries);

      const result = await serverReadDir("/some/dir");

      expect(result).toEqual(mockEntries);
    });

    it("should return empty array on error", async () => {
      mockFs.readdir.mockRejectedValue(new Error("ENOENT"));

      const result = await serverReadDir("/nonexistent");

      expect(result).toEqual([]);
    });
  });

  describe("serverDeleteDir", () => {
    it("should delete directory recursively", async () => {
      mockFs.rm.mockResolvedValue(undefined);

      await serverDeleteDir("/path/to/dir");

      expect(mockFs.rm).toHaveBeenCalledWith("/path/to/dir", {
        recursive: true,
      });
    });

    it("should log and not throw on error", async () => {
      mockFs.rm.mockRejectedValue(new Error("ENOENT"));

      await expect(serverDeleteDir("/nonexistent")).resolves.not.toThrow();
    });
  });

  describe("readOrderFile", () => {
    it("should return order data from .order.json", async () => {
      mockFs.readFile.mockResolvedValue(
        '{"categories": ["a", "b"], "items": ["1", "2"]}',
      );

      const result = await readOrderFile("/some/dir");

      expect(result).toEqual({ categories: ["a", "b"], items: ["1", "2"] });
    });

    it("should return null when file not found", async () => {
      mockFs.readFile.mockRejectedValue(new Error("ENOENT"));

      const result = await readOrderFile("/some/dir");

      expect(result).toBeNull();
    });

    it("should handle missing arrays gracefully", async () => {
      mockFs.readFile.mockResolvedValue('{"other": "data"}');

      const result = await readOrderFile("/some/dir");

      expect(result).toEqual({ categories: undefined, items: undefined });
    });
  });

  describe("writeOrderFile", () => {
    it("should write order data to .order.json", async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await writeOrderFile("/some/dir", {
        categories: ["cat1", "cat2"],
        items: ["item1"],
      });

      expect(result.success).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it("should not write empty arrays", async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await writeOrderFile("/some/dir", { categories: [], items: [] });

      const writeCall = mockFs.writeFile.mock.calls[0];
      const written = JSON.parse(writeCall[1]);
      expect(written).toEqual({});
    });

    it("should return failure on error", async () => {
      mockFs.mkdir.mockRejectedValue(new Error("Permission denied"));

      const result = await writeOrderFile("/restricted/dir", {
        categories: ["a"],
      });

      expect(result.success).toBe(false);
    });
  });
});
