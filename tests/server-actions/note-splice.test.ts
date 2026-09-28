import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import nodeFs from "fs";
import os from "os";
import path from "path";
import { mockFs, resetAllMocks } from "../setup";
import { RelationsStatus } from "@/app/_consts/relations";
import type { SanitisedUser } from "@/app/_types";

const mockCanReach = vi.fn();
const mockBroadcast = vi.fn();

vi.mock("@/app/_server/actions/ws/broadcast", () => ({
  broadcast: (...args: unknown[]) => mockBroadcast(...args),
}));
vi.mock("@/app/_server/actions/share/queries", () => ({
  reachableFile: async (...args: unknown[]) =>
    (await mockCanReach(...args)) ? filePath : null,
}));
vi.mock("@/app/_server/actions/history/repo", () => ({ commitNote: vi.fn().mockResolvedValue({ success: true }) }));
vi.mock("@/app/_server/actions/log", () => ({ logContentEvent: vi.fn() }));

import { SPLICE_DENIED, SPLICE_ENCRYPTED, spliceNote } from "@/app/_server/actions/note/splice";
import { closeRelationsDb, setRelationsStatus } from "@/app/_server/actions/relations/store";
import { findReplace } from "@/app/_utils/note-edits";
import { unlinkItem } from "@/app/_utils/item-links";

const NOTE = "aaaaaaaa-1111-4222-8333-944455556666";
const TARGET = "bbbbbbbb-1111-4222-8333-944455556666";
const alice = { username: "alice" } as SanitisedUser;

let root: string;
let filePath: string;

const put = (content: string) => {
  nodeFs.mkdirSync(path.dirname(filePath), { recursive: true });
  nodeFs.writeFileSync(filePath, content);
};

const onDisk = () => nodeFs.readFileSync(filePath, "utf-8");

describe("spliceNote", () => {
  beforeEach(async () => {
    resetAllMocks();
    const real = await vi.importActual<typeof import("fs/promises")>("fs/promises");
    mockFs.readFile.mockImplementation(real.readFile as never);
    mockFs.writeFile.mockImplementation(real.writeFile as never);
    mockFs.stat.mockImplementation(real.stat as never);
    mockFs.rename.mockImplementation(real.rename as never);
    mockFs.mkdir.mockImplementation(real.mkdir as never);
    mockFs.access.mockImplementation(real.access as never);
    mockFs.unlink.mockImplementation(real.unlink as never);
    root = nodeFs.mkdtempSync(path.join(os.tmpdir(), "jotty-splice-"));
    vi.spyOn(process, "cwd").mockReturnValue(root);
    process.env.JOTTY_RELATIONS_DB = path.join(root, "relations.db");
    closeRelationsDb();
    setRelationsStatus(RelationsStatus.READY);
    filePath = path.join(root, "data", "notes", "alice", "Home", "plan.md");
    mockCanReach.mockResolvedValue(true);
  });

  afterEach(() => {
    closeRelationsDb();
    vi.restoreAllMocks();
    nodeFs.rmSync(root, { recursive: true, force: true });
  });

  it("removes a link in place, keeping every other byte, CRLF and frontmatter included", async () => {
    const head = `---\r\nuuid: ${NOTE}\r\ntitle: 'Plan'\r\ncreatedAt: 2020-01-01T00:00:00.000Z\r\nsource: script\r\n---\r\n`;
    put(`${head}Intro  \r\n\r\n[Target](/note/${TARGET})\r\n\r\nOutro\r\n`);

    const result = await spliceNote(alice, NOTE, (body) => ({ body: unlinkItem(body, TARGET).text }));

    expect(result.error).toBeUndefined();
    expect(onDisk()).toBe(`${head}Intro  \r\n\r\nOutro\r\n`);
    expect(nodeFs.readdirSync(path.dirname(filePath))).toEqual(["plan.md"]);
    expect(mockBroadcast).toHaveBeenCalledWith(expect.objectContaining({ entityId: NOTE }));
  });

  it("keeps frontmatter tags in step when an edit changes the hashtags", async () => {
    put(`---\nuuid: ${NOTE}\ntitle: Plan\ncreatedAt: 2020-01-01T00:00:00.000Z\ntags:\n  - legacy\n---\nText #old\n`);

    const result = await spliceNote(alice, NOTE, (body) => findReplace(body, "#old", "#fresh"));

    expect(result.data?.tags).toEqual(["fresh", "legacy"]);
    expect(onDisk()).toContain("  - fresh\n  - legacy\n");
    expect(onDisk().endsWith("---\nText #fresh\n")).toBe(true);
  });

  it("drops a tag that only lives in frontmatter when asked to untag it", async () => {
    put(`---\nuuid: ${NOTE}\ntitle: Plan\ncreatedAt: 2020-01-01T00:00:00.000Z\ntags:\n  - hidden\n  - work\n---\nBody #work\n`);

    const result = await spliceNote(alice, NOTE, (body) => ({ body }), { untag: ["hidden"] });

    expect(result.data?.tags).toEqual(["work"]);
    expect(onDisk()).not.toContain("hidden");
    expect(onDisk().endsWith("---\nBody #work\n")).toBe(true);
  });

  it("reports a managed note so callers can warn", async () => {
    put(`---\nuuid: ${NOTE}\ntitle: Plan\ncreatedAt: 2020-01-01T00:00:00.000Z\nmanaged: true\n---\nold\n`);
    const result = await spliceNote(alice, NOTE, (body) => findReplace(body, "old", "new"));
    expect(result.data?.managed).toBe(true);
  });

  it("refuses encrypted notes and callers without edit rights", async () => {
    const locked = `---\nuuid: ${NOTE}\ntitle: Plan\nencrypted: true\n---\n-----BEGIN PGP MESSAGE-----\nabc\n-----END PGP MESSAGE-----\n`;
    put(locked);

    expect(await spliceNote(alice, NOTE, (body) => ({ body: `${body}x` }))).toEqual({
      success: false,
      error: SPLICE_ENCRYPTED,
    });
    mockCanReach.mockResolvedValue(false);
    expect((await spliceNote(alice, NOTE, (body) => ({ body: `${body}x` }))).error).toBe(SPLICE_DENIED);
    expect(onDisk()).toBe(locked);
  });
});
