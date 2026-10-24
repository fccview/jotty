import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import nodeFs from "fs";
import os from "os";
import path from "path";
import { mockFs, resetAllMocks } from "../setup";
import { RelationsStatus } from "@/app/_consts/relations";
import type { SanitisedUser } from "@/app/_types";

vi.mock("@/app/_server/actions/ws/broadcast", () => ({ broadcast: vi.fn() }));
vi.mock("@/app/_server/actions/history/repo", () => ({ commitNote: vi.fn().mockResolvedValue({ success: true }) }));
vi.mock("@/app/_server/actions/log", () => ({ logContentEvent: vi.fn(), logAudit: vi.fn() }));
vi.mock("@/app/_server/actions/users", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/_server/actions/users")>()),
  canAccessAllContent: async () => false,
}));

import { findClashes, findCrossUserClashes } from "@/app/_server/actions/uuid-clash/scan";
import { spliceNote } from "@/app/_server/actions/note/splice";
import { getUserByNoteUuid } from "@/app/_server/actions/users";
import { closeRelationsDb, setRelationsStatus } from "@/app/_server/actions/relations/store";

const DUP = "dddddddd-1111-4222-8333-944455556666";
const alice = { username: "alice" } as SanitisedUser;

let root: string;

const noteFile = (owner: string) => path.join(root, "data", "notes", owner, "Home", "plan.md");

const put = (owner: string, createdAt: string, body: string) => {
  nodeFs.mkdirSync(path.dirname(noteFile(owner)), { recursive: true });
  nodeFs.writeFileSync(noteFile(owner), `---\nuuid: ${DUP}\ntitle: Plan\ncreatedAt: ${createdAt}\n---\n${body}\n`);
};

describe("Security: a uuid shared across users", () => {
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
    mockFs.readdir.mockImplementation(real.readdir as never);
    root = nodeFs.mkdtempSync(path.join(os.tmpdir(), "jotty-cross-uuid-"));
    vi.spyOn(process, "cwd").mockReturnValue(root);
    process.env.JOTTY_RELATIONS_DB = path.join(root, "relations.db");
    closeRelationsDb();
    setRelationsStatus(RelationsStatus.READY);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    nodeFs.mkdirSync(path.join(root, "data", "users"), { recursive: true });
    nodeFs.writeFileSync(
      path.join(root, "data", "users", "users.json"),
      JSON.stringify([{ username: "bob" }, { username: "alice" }]),
    );
    put("alice", "2019-01-01T00:00:00.000Z", "alice's plan");
    put("bob", "2024-01-01T00:00:00.000Z", "bob's private plan");
  });

  afterEach(() => {
    closeRelationsDb();
    vi.restoreAllMocks();
    nodeFs.rmSync(root, { recursive: true, force: true });
  });

  it("is invisible to the per-owner scan", async () => {
    expect(await findClashes("alice")).toEqual([]);
    expect(await findClashes("bob")).toEqual([]);
  });

  it("is reported by the cross-user scan with the keeper first", async () => {
    const [clash] = await findCrossUserClashes(["alice", "bob"]);

    expect(clash.uuid).toBe(DUP);
    expect(clash.owner).toBe("alice");
    expect(clash.owners?.sort()).toEqual(["alice", "bob"]);
    expect(clash.files.map((file) => [file.owner, file.keeps])).toEqual([
      ["alice", true],
      ["bob", false],
    ]);
  });

  it("resolves the owner from the same file the permission check uses", async () => {
    expect((await getUserByNoteUuid(DUP)).data?.username).toBe("alice");
  });

  it("writes an edit into the file the caller was allowed to edit", async () => {
    const result = await spliceNote(alice, DUP, (body) => ({ body: `${body}edited\n` }));

    expect(result.success).toBe(true);
    expect(nodeFs.readFileSync(noteFile("alice"), "utf-8")).toContain("edited");
    expect(nodeFs.readFileSync(noteFile("bob"), "utf-8")).not.toContain("edited");
  });
});
