import { describe, it, expect, beforeEach, vi } from "vitest";
import path from "path";
import { Modes } from "@/app/_types/enums";
import { NOTES_DIR } from "@/app/_consts/files";
import { isPathSafe } from "@/app/_utils/path-utils";

const mockStat = vi.fn();
const mockMountsFor = vi.fn();

vi.mock("fs/promises", () => ({
  default: { stat: (...args: any[]) => mockStat(...args) },
  stat: (...args: any[]) => mockStat(...args),
}));

vi.mock("@/app/_server/actions/share/mounts", () => ({
  mountsFor: (...args: any[]) => mockMountsFor(...args),
  userDirFor: (mode: Modes, username: string) => NOTES_DIR(username),
}));

import { targetDir } from "@/app/_server/actions/share/target";

const OWNER = "fccview";
const HOME = path.join(process.cwd(), NOTES_DIR(OWNER));

describe("Security: path containment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStat.mockResolvedValue({ isDirectory: () => true });
    mockMountsFor.mockResolvedValue([]);
  });

  describe("isPathSafe", () => {
    it("should accept paths inside the base", () => {
      expect(isPathSafe(HOME, "Work/Sub")).toBe(true);
      expect(isPathSafe(HOME, "")).toBe(true);
    });

    it("should reject traversal instead of silently stripping it", () => {
      expect(isPathSafe(HOME, "../../victim/Secrets")).toBe(false);
      expect(isPathSafe(HOME, "Work/../../../victim")).toBe(false);
      expect(isPathSafe(HOME, "..")).toBe(false);
    });

    it("should reject absolute paths outside the base", () => {
      expect(isPathSafe(HOME, "/etc/passwd")).toBe(false);
    });

    it("should reject null bytes", () => {
      expect(isPathSafe(HOME, "Work\0/etc")).toBe(false);
    });

    it("should accept absolute paths already inside the base", () => {
      expect(isPathSafe(HOME, path.join(HOME, "Work", "note.md"))).toBe(true);
    });
  });

  describe("targetDir", () => {
    it("should resolve an owned category under the user's home", async () => {
      const target = await targetDir(Modes.NOTES, OWNER, "Work");

      expect(target.dir).toBe(path.join(HOME, "Work"));
      expect(target.owner).toBe(OWNER);
      expect(target.isMount).toBe(false);
    });

    it("should never hand back a directory outside the user's home", async () => {
      const target = await targetDir(
        Modes.NOTES,
        OWNER,
        "../../victim/Secrets",
      );

      expect(target.dir).toBe(HOME);
      expect(target.category).toBe("");
      expect(target.isMount).toBe(false);
    });

    it("should not touch disk when the category escapes", async () => {
      await targetDir(Modes.NOTES, OWNER, "../../victim");

      expect(mockStat).not.toHaveBeenCalled();
      expect(mockMountsFor).not.toHaveBeenCalled();
    });

    it("should contain traversal that hides behind a mount name", async () => {
      mockStat.mockRejectedValue(new Error("ENOENT"));
      mockMountsFor.mockResolvedValue([
        {
          owner: "jodi",
          displayName: "Shared",
          categoryPath: "Recipes",
          isImplicit: false,
          permissions: { canRead: true, canEdit: true, canDelete: false },
        },
      ]);

      const target = await targetDir(
        Modes.NOTES,
        OWNER,
        "Shared/../../../victim/Secrets",
      );

      expect(target.dir).toBe(HOME);
      expect(target.owner).toBe(OWNER);
      expect(target.isMount).toBe(false);
    });

    it("should still resolve a legitimate mount to the owner's tree", async () => {
      mockStat.mockRejectedValue(new Error("ENOENT"));
      mockMountsFor.mockResolvedValue([
        {
          owner: "jodi",
          displayName: "Shared",
          categoryPath: "Recipes",
          isImplicit: false,
          permissions: { canRead: true, canEdit: true, canDelete: false },
        },
      ]);

      const target = await targetDir(Modes.NOTES, OWNER, "Shared/Pasta");

      expect(target.dir).toBe(
        path.join(process.cwd(), NOTES_DIR("jodi"), "Recipes", "Pasta"),
      );
      expect(target.owner).toBe("jodi");
      expect(target.isMount).toBe(true);
    });
  });
});
