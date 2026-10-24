import { describe, it, expect, beforeEach, vi } from "vitest";
import path from "path";
import { createFormData } from "../setup";

const mockServerWriteFile = vi.fn();
const mockGenerateUniqueFilename = vi.fn();
const CATEGORY_DIR = vi.hoisted(() => "/srv/jotty/data/notes/alice/Work");

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

vi.mock("@/app/_utils/filename-utils", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    generateUniqueFilename: (...args: unknown[]) =>
      mockGenerateUniqueFilename(...args),
  };
});

vi.mock("@/app/_server/actions/file", () => ({
  ensureDir: vi.fn(),
  serverWriteFile: (...args: unknown[]) => mockServerWriteFile(...args),
}));

vi.mock("@/app/_server/actions/share/target", () => ({
  targetDir: vi.fn().mockResolvedValue({
    dir: CATEGORY_DIR,
    owner: "alice",
    category: "Work",
    isMount: false,
  }),
  bouncer: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock("@/app/_server/actions/relations/tidy", () => ({
  tidyItemLinks: vi.fn().mockImplementation(async (content: string) => content),
}));

vi.mock("@/app/_server/actions/log", () => ({
  logContentEvent: vi.fn(),
}));

vi.mock("@/app/_server/actions/history/repo", () => ({
  commitNote: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/app/_server/actions/ws/broadcast", () => ({
  broadcast: vi.fn(),
}));

vi.mock("@/app/_utils/checklist-utils", () => ({
  listToMarkdown: vi.fn().mockReturnValue("# list"),
}));

import { sanitizeFilename } from "@/app/_utils/filename-utils";
import { fenceFilename } from "@/app/_server/actions/lib/filename-fence";
import { makeNote } from "@/app/_server/actions/note/creator";
import { makeList } from "@/app/_server/actions/checklist/creator";
import { FileRenameMode, SanitisedUser } from "@/app/_types";

const ESCAPES = [
  "../../bob/Uncategorized/x",
  "..\\..\\bob\\x",
  "/etc/cron.d/x",
  "a\0b",
  "..",
  ".hidden",
];

const actor = (fileRenameMode: FileRenameMode): SanitisedUser => ({
  username: "alice",
  isAdmin: false,
  fileRenameMode,
  preferredDateFormat: "dd/mm/yyyy",
  preferredTimeFormat: "24-hours",
});

describe("Security: titles cannot pick a path", () => {
  beforeEach(() => {
    mockServerWriteFile.mockReset();
    mockGenerateUniqueFilename.mockReset();
  });

  describe("sanitizeFilename", () => {
    const modes: FileRenameMode[] = ["none", "minimal", "dash-case"];

    it.each(modes.flatMap((mode) => ESCAPES.map((title) => [mode, title])))(
      "%s mode strips separators, NUL and leading dots from %j",
      (mode, title) => {
        const name = sanitizeFilename(title, mode as FileRenameMode);

        expect(name).not.toMatch(/[/\\\0]/);
        expect(name.startsWith(".")).toBe(false);
        expect(fenceNoop(`${name || "x"}.md`)).toBe(true);
      },
    );

    it("none mode leaves every other character alone", () => {
      expect(sanitizeFilename("My: Note? <3 ü", "none")).toBe("My: Note? <3 ü");
      expect(sanitizeFilename("v1.2 notes.", "none")).toBe("v1.2 notes.");
    });
  });

  describe("fenceFilename", () => {
    it.each(["x.md", "My Note.md", "a..b.md"])("lets %s through", async (name) => {
      expect(await fenceFilename(CATEGORY_DIR, name)).toBeNull();
    });

    it.each(["../x.md", "../../bob/x.md", "sub/x.md", "/etc/x.md", "x\0.md", ""])(
      "refuses %j",
      async (name) => {
        expect(await fenceFilename(CATEGORY_DIR, name)).toBe("filenameOutOfBounds");
      },
    );
  });

  describe("create refuses a filename that would leave its category", () => {
    it.each([
      ["note", makeNote],
      ["checklist", makeList],
    ] as const)("%s", async (_kind, make) => {
      mockGenerateUniqueFilename.mockResolvedValue("../../bob/Uncategorized/x.md");

      const result = await make(
        actor("none"),
        createFormData({ title: "../../bob/Uncategorized/x", category: "Work", rawContent: "hello" }),
      );

      expect(result.error).toBe("filenameOutOfBounds");
      expect(mockServerWriteFile).not.toHaveBeenCalled();
    });

    it("writes a hostile title inside the category in none mode", async () => {
      const { generateUniqueFilename } = await vi.importActual<
        typeof import("@/app/_utils/filename-utils")
      >("@/app/_utils/filename-utils");
      mockGenerateUniqueFilename.mockImplementation(generateUniqueFilename);

      const result = await makeNote(
        actor("none"),
        createFormData({ title: "../../bob/Uncategorized/x", category: "Work", rawContent: "hello" }),
      );

      expect(result.success).toBe(true);
      expect(mockServerWriteFile).toHaveBeenCalledTimes(1);
      expect(mockServerWriteFile.mock.calls[0][0]).toBe(
        path.join(CATEGORY_DIR, "bobUncategorizedx.md"),
      );
      expect(result.data?.title).toBe("../../bob/Uncategorized/x");
    });
  });
});

const fenceNoop = (name: string) =>
  path.dirname(path.resolve(CATEGORY_DIR, name)) === path.resolve(CATEGORY_DIR);
