import { describe, it, expect, beforeEach, vi } from "vitest";
import path from "path";
import { resetAllMocks, mockFs } from "../setup";

const mockIsAdmin = vi.fn();
const mockNeedsMigration = vi.fn();
const mockReadCatInfo = vi.fn();
const mockWriteCatInfo = vi.fn();
const mockCatUuid = vi.fn();
const mockDirUuids = vi.fn();
const mockGrepFrontmatter = vi.fn();

vi.mock("@/app/_server/actions/users", () => ({
  isAdmin: (...args: any[]) => mockIsAdmin(...args),
}));

vi.mock("@/app/_server/actions/lib/migration-check", () => ({
  needsMigration: (...args: any[]) => mockNeedsMigration(...args),
}));

vi.mock("@/app/_server/actions/share/category-info", () => ({
  readCatInfo: (...args: any[]) => mockReadCatInfo(...args),
  writeCatInfo: (...args: any[]) => mockWriteCatInfo(...args),
  catUuid: (...args: any[]) => mockCatUuid(...args),
  dirUuids: (...args: any[]) => mockDirUuids(...args),
}));

vi.mock("@/app/_utils/grep-utils", () => ({
  grepExtractFrontmatter: (...args: any[]) => mockGrepFrontmatter(...args),
  grepFindFileByUuid: vi.fn().mockResolvedValue(null),
}));

import { migrateToInlineSharing } from "@/app/_server/actions/migration/share-migration";

const NOTES_DIR = path.join(process.cwd(), "data", "notes");
const OWNER_DIR = path.join(NOTES_DIR, "alice");
const WORK_DIR = path.join(OWNER_DIR, "Work");
const ORDER_FILE = path.join(OWNER_DIR, ".order.json");

const dirEntry = (name: string) => ({
  name,
  isDirectory: () => true,
  isFile: () => false,
});

const fileEntry = (name: string) => ({
  name,
  isDirectory: () => false,
  isFile: () => true,
});

let legacyOrder: { categories?: string[]; items?: string[] };

describe("share migration ordering", () => {
  beforeEach(() => {
    resetAllMocks();
    mockIsAdmin.mockResolvedValue(true);
    mockNeedsMigration.mockResolvedValue(false);
    mockReadCatInfo.mockResolvedValue({ uuid: "owner-cat-uuid" });
    mockWriteCatInfo.mockResolvedValue(undefined);
    mockCatUuid.mockResolvedValue("cat-uuid");
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.unlink.mockResolvedValue(undefined);

    legacyOrder = { categories: ["Work"], items: ["note-a"] };

    mockFs.readdir.mockImplementation(async (dir: string) => {
      if (dir === NOTES_DIR) return [dirEntry("alice")];
      if (dir === OWNER_DIR) {
        return [dirEntry("Work"), fileEntry("note-a.md")];
      }
      return [];
    });

    mockFs.access.mockImplementation(async (target: string) => {
      if (target === ORDER_FILE) return undefined;
      throw new Error("ENOENT");
    });

    mockFs.readFile.mockImplementation(async (target: string) => {
      if (target === ORDER_FILE) return JSON.stringify(legacyOrder);
      if (target.endsWith(".md")) return "---\nuuid: kept\n---\n\nBody";
      throw new Error("ENOENT");
    });

    mockDirUuids.mockImplementation(async (_dir: string, names: string[]) => {
      const map = new Map<string, string>();
      names.forEach((name) => {
        if (name === "Work") map.set(name, "work-uuid");
      });
      return map;
    });

    mockGrepFrontmatter.mockImplementation(async (filePath: string) =>
      filePath.endsWith("note-a.md") ? { uuid: "note-a-uuid" } : null,
    );
  });

  it("should delete the legacy order file once every entry migrated", async () => {
    const result = await migrateToInlineSharing();

    expect(result.success).toBe(true);
    expect(mockFs.unlink).toHaveBeenCalledWith(ORDER_FILE);
    expect(mockWriteCatInfo).toHaveBeenCalledWith(
      OWNER_DIR,
      expect.objectContaining({
        order: { categories: ["work-uuid"], items: ["note-a-uuid"] },
      }),
    );
  });

  it("should keep the legacy order file when a category does not resolve", async () => {
    legacyOrder = { categories: ["Work", "Ghost"], items: ["note-a"] };

    const result = await migrateToInlineSharing();

    expect(result.success).toBe(true);
    expect(mockFs.unlink).not.toHaveBeenCalledWith(ORDER_FILE);
    expect(result.data?.changes).toContainEqual(
      expect.stringContaining("Ghost"),
    );
  });

  it("should keep the legacy order file when a markdown item does not resolve", async () => {
    legacyOrder = { categories: ["Work"], items: ["note-a", "vanished"] };

    const result = await migrateToInlineSharing();

    expect(result.success).toBe(true);
    expect(mockFs.unlink).not.toHaveBeenCalledWith(ORDER_FILE);
    expect(result.data?.changes).toContainEqual(
      expect.stringContaining("vanished.md"),
    );
  });

  it("should still persist the entries it could migrate", async () => {
    legacyOrder = { categories: ["Work", "Ghost"], items: ["note-a", "vanished"] };

    await migrateToInlineSharing();

    expect(mockWriteCatInfo).toHaveBeenCalledWith(
      OWNER_DIR,
      expect.objectContaining({
        order: { categories: ["work-uuid"], items: ["note-a-uuid"] },
      }),
    );
  });

  it("should leave the work subfolder alone when it has no legacy order file", async () => {
    await migrateToInlineSharing();

    expect(mockFs.unlink).not.toHaveBeenCalledWith(
      path.join(WORK_DIR, ".order.json"),
    );
  });
});
