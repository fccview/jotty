import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetAllMocks, mockFs } from "../setup";

const mockServerReadDir = vi.fn();
const mockServerReadFile = vi.fn();
const mockReadOrderFile = vi.fn();
const mockGrepFrontmatter = vi.fn();
const mockGrepExcerpt = vi.fn();

vi.mock("@/app/_server/actions/file", () => ({
  serverReadDir: (...args: any[]) => mockServerReadDir(...args),
  serverReadFile: (...args: any[]) => mockServerReadFile(...args),
  readOrderFile: (...args: any[]) => mockReadOrderFile(...args),
}));

vi.mock("@/app/_utils/grep-utils", () => ({
  grepExtractFrontmatter: (...args: any[]) => mockGrepFrontmatter(...args),
  grepExtractExcerpt: (...args: any[]) => mockGrepExcerpt(...args),
}));

vi.mock("@/app/_server/actions/share/category-info", () => ({
  dirUuids: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock("@/app/_server/actions/note/parsers", () => ({
  parseMarkdownNote: vi.fn(),
}));

vi.mock("child_process", () => ({
  exec: vi.fn((_cmd: string, _opts: unknown, callback: any) => {
    const done = callback || _opts;
    done(new Error("exec unavailable in tests"));
  }),
}));

import { readNotesRecursively } from "@/app/_server/actions/note/readers";

const fileEntry = (name: string) => ({
  name,
  isDirectory: () => false,
  isFile: () => true,
});

const DIR = "/data/notes/testuser";

describe("readNotesRecursively uuid contract", () => {
  beforeEach(() => {
    resetAllMocks();
    mockReadOrderFile.mockResolvedValue(null);
    mockGrepExcerpt.mockResolvedValue("An excerpt");
    mockFs.stat.mockResolvedValue({
      birthtime: new Date("2024-01-01T00:00:00.000Z"),
      mtime: new Date("2024-01-02T00:00:00.000Z"),
    });
    mockFs.writeFile.mockResolvedValue(undefined);
  });

  it("should stamp and return a uuid when the note has none", async () => {
    mockServerReadDir.mockResolvedValue([fileEntry("stampable.md")]);
    mockGrepFrontmatter.mockResolvedValue({ title: "Stampable" });
    mockServerReadFile.mockResolvedValue("---\ntitle: Stampable\n---\n\nBody");

    const notes = await readNotesRecursively(
      DIR,
      "Work",
      "testuser",
      false,
      false,
      true,
    );

    expect(notes).toHaveLength(1);
    expect(notes[0].uuid).toBeTruthy();
    expect(mockFs.writeFile).toHaveBeenCalled();
  });

  it("should skip a metadata-only note whose file cannot be read", async () => {
    mockServerReadDir.mockResolvedValue([fileEntry("unreadable.md")]);
    mockGrepFrontmatter.mockResolvedValue({ title: "Unreadable" });
    mockServerReadFile.mockResolvedValue(null);

    const notes = await readNotesRecursively(
      DIR,
      "Work",
      "testuser",
      false,
      false,
      true,
    );

    expect(notes).toHaveLength(0);
  });

  it("should skip a metadata-only note whose stamp cannot be persisted", async () => {
    mockServerReadDir.mockResolvedValue([fileEntry("readonly.md")]);
    mockGrepFrontmatter.mockResolvedValue({ title: "Read only" });
    mockServerReadFile.mockResolvedValue("---\ntitle: Read only\n---\n\nBody");
    mockFs.writeFile.mockRejectedValue(new Error("EROFS"));

    const notes = await readNotesRecursively(
      DIR,
      "Work",
      "testuser",
      false,
      false,
      true,
    );

    expect(notes).toHaveLength(0);
  });

  it("should skip an excerpt note whose stamp cannot be persisted", async () => {
    mockServerReadDir.mockResolvedValue([fileEntry("excerpt-readonly.md")]);
    mockGrepFrontmatter.mockResolvedValue({ title: "Excerpt" });
    mockServerReadFile.mockResolvedValue("---\ntitle: Excerpt\n---\n\nBody");
    mockFs.writeFile.mockRejectedValue(new Error("EROFS"));

    const notes = await readNotesRecursively(
      DIR,
      "Work",
      "testuser",
      false,
      false,
      false,
      200,
    );

    expect(notes).toHaveLength(0);
  });

  it("should keep an excerpt note that already carries a uuid", async () => {
    mockServerReadDir.mockResolvedValue([fileEntry("kept.md")]);
    mockGrepFrontmatter.mockResolvedValue({
      title: "Kept",
      uuid: "known-uuid",
    });

    const notes = await readNotesRecursively(
      DIR,
      "Work",
      "testuser",
      false,
      false,
      false,
      200,
    );

    expect(notes).toHaveLength(1);
    expect(notes[0].uuid).toBe("known-uuid");
    expect(mockFs.writeFile).not.toHaveBeenCalled();
  });

  it("should never return a note carrying an undefined uuid", async () => {
    mockServerReadDir.mockResolvedValue([
      fileEntry("good.md"),
      fileEntry("broken.md"),
    ]);
    mockGrepFrontmatter.mockImplementation(async (filePath: string) =>
      filePath.endsWith("good.md")
        ? { title: "Good", uuid: "good-uuid" }
        : { title: "Broken" },
    );
    mockServerReadFile.mockResolvedValue(null);

    const notes = await readNotesRecursively(
      DIR,
      "Work",
      "testuser",
      false,
      false,
      true,
    );

    expect(notes).toHaveLength(1);
    expect(notes.every((note) => Boolean(note.uuid))).toBe(true);
  });
});
