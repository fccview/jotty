import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetAllMocks, mockFs } from "../setup";
import { Modes, ItemTypes } from "@/app/_types/enums";

const mockReadJsonFile = vi.fn();
const mockGrepExtractField = vi.fn();
const mockIsPublicItem = vi.fn();

vi.mock("@/app/_server/actions/file", () => ({
  readJsonFile: (...args: any[]) => mockReadJsonFile(...args),
}));

vi.mock("@/app/_utils/grep-utils", () => ({
  grepExtractField: (...args: any[]) => mockGrepExtractField(...args),
}));

vi.mock("@/app/_server/actions/share/queries", () => ({
  isPublicItem: (...args: any[]) => mockIsPublicItem(...args),
}));

vi.mock("@/app/_server/actions/log", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

import {
  legacyResolve,
  publicResolve,
} from "@/app/_server/actions/lib/legacy-lookup";

const CATEGORY = "Work";
const SLUG = "shared-slug";

const ownerOf = (filePath: string): string =>
  filePath.includes("/alice/") ? "alice" : "bob";

describe("legacy lookup", () => {
  beforeEach(() => {
    resetAllMocks();
    mockReadJsonFile.mockResolvedValue([
      { username: "alice" },
      { username: "bob" },
    ]);
    mockFs.access.mockResolvedValue(undefined);
    mockGrepExtractField.mockImplementation(async (filePath: string) =>
      ownerOf(filePath) === "alice" ? "alice-uuid" : "bob-uuid",
    );
  });

  describe("legacyResolve", () => {
    it("should return the first owner match for an authenticated lookup", async () => {
      const uuid = await legacyResolve(Modes.NOTES, CATEGORY, SLUG, "bob");

      expect(uuid).toBe("bob-uuid");
    });

    it("should still return the first match when no owner is given", async () => {
      const uuid = await legacyResolve(Modes.NOTES, CATEGORY, SLUG);

      expect(uuid).toBe("alice-uuid");
    });
  });

  describe("publicResolve", () => {
    it("should skip a private first match and resolve the public one", async () => {
      mockIsPublicItem.mockImplementation(
        async (uuid: string) => uuid === "bob-uuid",
      );

      const uuid = await publicResolve(
        Modes.NOTES,
        CATEGORY,
        SLUG,
        ItemTypes.NOTE,
      );

      expect(uuid).toBe("bob-uuid");
    });

    it("should refuse to answer when several candidates are public", async () => {
      mockIsPublicItem.mockResolvedValue(true);

      const uuid = await publicResolve(
        Modes.NOTES,
        CATEGORY,
        SLUG,
        ItemTypes.NOTE,
      );

      expect(uuid).toBeNull();
    });

    it("should refuse to answer when no candidate is public", async () => {
      mockIsPublicItem.mockResolvedValue(false);

      const uuid = await publicResolve(
        Modes.NOTES,
        CATEGORY,
        SLUG,
        ItemTypes.NOTE,
      );

      expect(uuid).toBeNull();
    });

    it("should resolve a lone public match", async () => {
      mockReadJsonFile.mockResolvedValue([{ username: "alice" }]);
      mockIsPublicItem.mockResolvedValue(true);

      const uuid = await publicResolve(
        Modes.NOTES,
        CATEGORY,
        SLUG,
        ItemTypes.NOTE,
      );

      expect(uuid).toBe("alice-uuid");
    });

    it("should weigh every owner rather than stopping at the first hit", async () => {
      mockIsPublicItem.mockResolvedValue(false);

      await publicResolve(Modes.NOTES, CATEGORY, SLUG, ItemTypes.NOTE);

      expect(mockIsPublicItem).toHaveBeenCalledWith("alice-uuid", ItemTypes.NOTE);
      expect(mockIsPublicItem).toHaveBeenCalledWith("bob-uuid", ItemTypes.NOTE);
    });
  });
});
