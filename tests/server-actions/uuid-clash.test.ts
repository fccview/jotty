import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import nodeFs from "fs";
import os from "os";
import path from "path";
import { mockFs, resetAllMocks } from "../setup";
import { RelationsStatus } from "@/app/_consts/relations";

const mockBroadcast = vi.fn();

vi.mock("@/app/_server/actions/ws/broadcast", () => ({
  broadcast: (...args: unknown[]) => mockBroadcast(...args),
}));

import { dropClashes, rankClaims } from "@/app/_server/actions/lib/uuid-keeper";
import { grepFindFileByUuid } from "@/app/_utils/grep-utils";
import { forgetItemFile, indexItemFile } from "@/app/_server/actions/relations/indexer";
import { closeRelationsDb, relationsDb, setRelationsStatus } from "@/app/_server/actions/relations/store";

const SHARED = "aaaaaaaa-1111-4222-8333-944455556666";

let root: string;
let warn: ReturnType<typeof vi.spyOn>;

const noteDir = () => path.join(root, "data", "notes", "alice");

const put = (rel: string, title: string, created?: string) => {
  const filePath = path.join(noteDir(), rel);
  const content = `---\nuuid: ${SHARED}\ntitle: ${title}\n${created ? `createdAt: ${created}\n` : ""}---\n\nBody of ${title}.\n`;
  nodeFs.mkdirSync(path.dirname(filePath), { recursive: true });
  nodeFs.writeFileSync(filePath, content);
  return { filePath, content };
};

const indexed = () =>
  relationsDb().prepare("SELECT path, title FROM items WHERE uuid = ?").get(SHARED) as
    | { path: string; title: string }
    | undefined;

describe("duplicate uuids", () => {
  beforeEach(async () => {
    resetAllMocks();
    const real = await vi.importActual<typeof import("fs/promises")>("fs/promises");
    mockFs.readFile.mockImplementation(real.readFile as never);
    root = nodeFs.mkdtempSync(path.join(os.tmpdir(), "jotty-clash-"));
    vi.spyOn(process, "cwd").mockReturnValue(root);
    process.env.JOTTY_RELATIONS_DB = path.join(root, "relations.db");
    closeRelationsDb();
    setRelationsStatus(RelationsStatus.READY);
    globalThis.__jottyClashWarned = undefined;
    warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    closeRelationsDb();
    vi.restoreAllMocks();
    nodeFs.rmSync(root, { recursive: true, force: true });
  });

  it("lets the oldest createdAt keep the uuid, and treats a missing one as newest", () => {
    const older = put("Home/old.md", "Old", "2020-01-01T00:00:00.000Z");
    const newer = put("Home/new.md", "New", "2024-01-01T00:00:00.000Z");
    const unstamped = put("Home/aaa.md", "Script copy");

    expect(rankClaims([unstamped.filePath, newer.filePath, older.filePath])).toEqual([
      older.filePath,
      newer.filePath,
      unstamped.filePath,
    ]);
  });

  it("breaks a createdAt tie on the path so every reader picks the same file", () => {
    const b = put("b.md", "B", "2020-01-01T00:00:00.000Z");
    const a = put("a.md", "A", "2020-01-01T00:00:00.000Z");
    expect(rankClaims([b.filePath, a.filePath])[0]).toBe(a.filePath);
    expect(rankClaims([a.filePath, b.filePath])[0]).toBe(a.filePath);
  });

  it("lists one note per uuid and warns once with both paths", () => {
    const keeper = put("Home/old.md", "Old", "2020-01-01T00:00:00.000Z");
    const copy = put("Home/new.md", "New");
    const listed = [
      { uuid: SHARED, id: "new", category: "Home", title: "New" },
      { uuid: SHARED, id: "old", category: "Home", title: "Old" },
      { uuid: "other", id: "x", category: "Home", title: "X" },
    ];

    const kept = dropClashes(listed, noteDir());
    dropClashes(listed, noteDir());

    expect(kept.map((note) => note.title)).toEqual(["Old", "X"]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain(keeper.filePath);
    expect(String(warn.mock.calls[0][0])).toContain(copy.filePath);
  });

  it("opens the keeper when a link or get asks for the uuid", async () => {
    put("Home/zzz-old.md", "Old", "2020-01-01T00:00:00.000Z");
    put("Home/aaa-new.md", "New");
    nodeFs.mkdirSync(path.join(noteDir(), "Other"), { recursive: true });
    nodeFs.writeFileSync(
      path.join(noteDir(), "Other/mentions.md"),
      `---\nuuid: bbbbbbbb-1111-4222-8333-944455556666\n---\n\n\`\`\`\nuuid: ${SHARED}\n\`\`\`\n`,
    );

    const found = await grepFindFileByUuid(noteDir(), SHARED);
    expect(found?.id).toBe("zzz-old");
  });

  it("finds a note whose frontmatter uses CRLF line endings", async () => {
    const filePath = path.join(noteDir(), "Home", "windows.md");
    nodeFs.mkdirSync(path.dirname(filePath), { recursive: true });
    nodeFs.writeFileSync(filePath, `---\r\nuuid: ${SHARED}\r\ntitle: Windows\r\n---\r\nBody\r\n`);

    expect((await grepFindFileByUuid(noteDir(), SHARED))?.id).toBe("windows");
  });

  it("indexes the keeper whichever file the index sees first", () => {
    const keeper = put("Home/old.md", "Old", "2020-01-01T00:00:00.000Z");
    const copy = put("Home/new.md", "New");

    indexItemFile(copy.filePath, copy.content, 2);
    indexItemFile(keeper.filePath, keeper.content, 1);
    expect(indexed()?.title).toBe("Old");

    indexItemFile(copy.filePath, copy.content, 3);
    expect(indexed()?.title).toBe("Old");
  });

  it("hands the uuid to the survivor when the keeper is deleted", () => {
    const keeper = put("Home/old.md", "Old", "2020-01-01T00:00:00.000Z");
    const copy = put("Home/new.md", "New");
    indexItemFile(keeper.filePath, keeper.content, 1);
    indexItemFile(copy.filePath, copy.content, 2);

    nodeFs.rmSync(keeper.filePath);
    forgetItemFile(keeper.filePath);

    expect(indexed()?.title).toBe("New");
    const clashes = relationsDb().prepare("SELECT COUNT(*) AS n FROM clashes").get() as { n: number };
    expect(clashes.n).toBe(0);
  });
});
