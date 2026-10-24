import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetAllMocks, mockFs } from "../setup";

vi.unmock("@/app/_utils/checklist-utils");

const mockServerReadDir = vi.fn();
const mockServerReadFile = vi.fn();

vi.mock("@/app/_server/actions/file", () => ({
  serverReadDir: (...args: unknown[]) => mockServerReadDir(...args),
  serverReadFile: (...args: unknown[]) => mockServerReadFile(...args),
  serverReadExisting: async (...args: unknown[]) => (await mockServerReadFile(...args)) ?? null,
  serverWriteFile: vi.fn(),
  readOrderFile: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/app/_utils/grep-utils", () => ({
  grepExtractFrontmatter: vi.fn().mockResolvedValue({}),
  grepExtractExcerpt: vi.fn(),
}));

vi.mock("@/app/_server/actions/share/category-info", () => ({
  dirUuids: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock("@/app/_utils/shell-utils", () => ({
  boxedShell: vi.fn(async () => {
    throw new Error("shell unavailable in tests");
  }),
}));

import { readNotesRecursively } from "@/app/_server/actions/note/readers";
import { readListsRecursively } from "@/app/_server/actions/checklist/readers";
import { CARD_EXCERPT_LIMIT } from "@/app/_consts/notes";

const file = (name: string) => ({ name, isDirectory: () => false, isFile: () => true });
const folder = (name: string) => ({ name, isDirectory: () => true, isFile: () => false });

const NOTE_UUID = "0b6f7f2e-3a4c-4d5e-9f10-1a2b3c4d5e61";
const SEALED_UUID = "0b6f7f2e-3a4c-4d5e-9f10-1a2b3c4d5e62";
const LIST_UUID = "0b6f7f2e-3a4c-4d5e-9f10-1a2b3c4d5e63";
const RECUR_UUID = "0b6f7f2e-3a4c-4d5e-9f10-1a2b3c4d5e64";

const stamp = (iso: string) => ({ birthtime: new Date(0), mtime: new Date(iso) });

describe("browse summaries", () => {
  beforeEach(() => {
    resetAllMocks();
    mockFs.stat.mockResolvedValue(stamp("2026-01-01T00:00:00.000Z"));
  });

  it("lists notes without their bodies, with the card excerpt and word count", async () => {
    const dir = "/summaries/notes/a";
    mockServerReadDir.mockResolvedValue([file("plain.md"), file("sealed.md")]);
    mockServerReadFile.mockImplementation(async (filePath: string) =>
      filePath.endsWith("plain.md")
        ? `---\nuuid: ${NOTE_UUID}\ntitle: Plain\n---\n# Hi\n\n**three** words ${"long ".repeat(800)}`
        : `---\nuuid: ${SEALED_UUID}\ntitle: Sealed\nencrypted: true\n---\n-----BEGIN PGP MESSAGE-----\nabc`,
    );

    const notes = await readNotesRecursively(dir, "a", { basePath: "Work", summarize: true });
    const plain = notes.find((note) => note.uuid === NOTE_UUID)!;
    const sealed = notes.find((note) => note.uuid === SEALED_UUID)!;

    expect(plain.content).toBe("");
    expect(plain.wordCount).toBe(803);
    expect(plain.excerpt?.startsWith("Hi three words long")).toBe(true);
    expect(plain.excerpt?.length).toBe(CARD_EXCERPT_LIMIT);
    expect(plain.sourcePath).toContain("plain.md");
    expect(sealed.content).toBe("");
    expect(sealed.excerpt).toBe("");
    expect(sealed.wordCount).toBe(0);
    expect(JSON.stringify(sealed)).not.toContain("PGP");
  });

  it("reuses a summary until the file changes", async () => {
    const dir = "/summaries/notes/b";
    mockServerReadDir.mockResolvedValue([file("plain.md")]);
    mockServerReadFile.mockResolvedValue(`---\nuuid: ${NOTE_UUID}\ntitle: Plain\n---\nfirst`);

    const read = () => readNotesRecursively(dir, "b", { summarize: true });

    await read();
    await read();
    expect(mockServerReadFile).toHaveBeenCalledTimes(1);

    mockFs.stat.mockResolvedValue(stamp("2026-01-02T00:00:00.000Z"));
    mockServerReadFile.mockResolvedValue(`---\nuuid: ${NOTE_UUID}\ntitle: Plain\n---\nsecond edit`);
    const [note] = await read();

    expect(mockServerReadFile).toHaveBeenCalledTimes(2);
    expect(note.excerpt).toBe("second edit");
  });

  it("lists checklists as summaries but keeps recurring ones whole", async () => {
    const dir = "/summaries/lists/c";
    mockServerReadDir.mockImplementation(async (target: string) =>
      target === dir ? [folder("Home")] : target.endsWith("Home") ? [file("plain.md"), file("recur.md")] : [],
    );
    mockServerReadFile.mockImplementation(async (filePath: string) =>
      filePath.endsWith("plain.md")
        ? `---\nuuid: ${LIST_UUID}\ntitle: Plain\nchecklistType: simple\n---\n- [x] one\n- [ ] two\n- [ ] three`
        : `---\nuuid: ${RECUR_UUID}\ntitle: Recur\nchecklistType: simple\n---\n- [ ] water plants | recurrence:{"rrule":"FREQ=DAILY","dtstart":"2026-01-01"}`,
    );

    const lists = await readListsRecursively(dir, "c", { summarize: true });
    const plain = lists.find((list) => list.uuid === LIST_UUID)!;

    expect(plain.items).toEqual([]);
    expect(plain.summary).toMatchObject({ total: 3, completed: 1, isFinished: false });
    expect(plain.summary?.open.map((item) => item.text)).toEqual(["two", "three"]);

    const recur = lists.find((list) => list.uuid === RECUR_UUID)!;
    expect(recur.summary).toBeUndefined();
    expect(recur.items?.[0].recurrence?.rrule).toBe("FREQ=DAILY");
  });
});
