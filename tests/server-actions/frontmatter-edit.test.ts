import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import nodeFs from "fs";
import os from "os";
import path from "path";
import { mockFs, resetAllMocks } from "../setup";
import { RelationsStatus } from "@/app/_consts/relations";
import { ItemTypes, Modes, PermissionTypes } from "@/app/_types/enums";

const mockReachable = vi.fn();
const mockBroadcast = vi.fn();
const mockCommit = vi.fn().mockResolvedValue({ success: true });
const mockGetCurrentUser = vi.fn();
const mockAnnounce = vi.fn();
const mockTell = vi.fn();
const mockFindUser = vi.fn();

vi.mock("@/app/_server/actions/users", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));
vi.mock("@/app/_server/actions/ws/broadcast", () => ({
  broadcast: (...args: unknown[]) => mockBroadcast(...args),
}));
vi.mock("@/app/_server/actions/share/queries", () => ({
  reachableFile: async (...args: unknown[]) => ((await mockReachable(...args)) ? filePath : null),
}));
vi.mock("@/app/_server/actions/share/grants", () => ({
  announceShare: (...args: unknown[]) => mockAnnounce(...args),
  tellReceiver: (...args: unknown[]) => mockTell(...args),
}));
vi.mock("@/app/_server/actions/users/records", () => ({
  findUserRecord: async (username: string) => mockFindUser(username),
}));
vi.mock("@/app/_server/actions/history/repo", () => ({
  commitNote: (...args: unknown[]) => mockCommit(...args),
}));
vi.mock("@/app/_server/actions/log", () => ({ logAudit: vi.fn() }));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));

import { readFrontmatter, saveFrontmatter } from "@/app/_server/actions/frontmatter";
import { CustomFieldErrors, parseCustom } from "@/app/_server/actions/frontmatter/fields";
import { closeRelationsDb, setRelationsStatus } from "@/app/_server/actions/relations/store";

const NOTE = "aaaaaaaa-1111-4222-8333-944455556666";
const FRESH = "dddddddd-1111-4222-8333-944455556666";
const OTHER = "cccccccc-1111-4222-8333-944455556666";

let root: string;
let filePath: string;

const put = (content: string, at = filePath) => {
  nodeFs.mkdirSync(path.dirname(at), { recursive: true });
  nodeFs.writeFileSync(at, content);
};

const onDisk = () => nodeFs.readFileSync(filePath, "utf-8");

const HEAD = `---\nuuid: ${NOTE}\ntitle: Plan\ncreatedAt: 2020-01-01T00:00:00.000Z\ntags:\n  - work\nsharedWith: bob:rw\nstatus: draft\n---\n`;
const BODY = "Intro #work\r\n\r\nOutro  \r\n";

const asUser = (username: string) => mockGetCurrentUser.mockResolvedValue({ username });

describe("frontmatter editor", () => {
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
    root = nodeFs.mkdtempSync(path.join(os.tmpdir(), "jotty-frontmatter-"));
    vi.spyOn(process, "cwd").mockReturnValue(root);
    process.env.JOTTY_RELATIONS_DB = path.join(root, "relations.db");
    closeRelationsDb();
    setRelationsStatus(RelationsStatus.READY);
    filePath = path.join(root, "data", "notes", "alice", "Home", "plan.md");
    asUser("alice");
    mockReachable.mockResolvedValue(true);
    mockFindUser.mockImplementation((username: string) => (["bob", "carol"].includes(username) ? { username } : null));
  });

  afterEach(() => {
    closeRelationsDb();
    vi.restoreAllMocks();
    nodeFs.rmSync(root, { recursive: true, force: true });
  });

  it("shows the owner every key", async () => {
    put(HEAD + BODY);

    const result = await readFrontmatter(NOTE, ItemTypes.NOTE);

    expect(result.data).toContain(`uuid: ${NOTE}`);
    expect(result.data).toContain("sharedWith: bob:rw");
    expect(result.data).toContain("status: draft");
    expect(mockReachable).toHaveBeenCalledWith(NOTE, ItemTypes.NOTE, "alice", PermissionTypes.READ);
  });

  it("hides uuid and sharedWith from anyone who isn't the owner", async () => {
    put(HEAD + BODY);
    asUser("bob");

    const result = await readFrontmatter(NOTE, ItemTypes.NOTE);

    expect(result.data).not.toContain("uuid");
    expect(result.data).not.toContain("sharedWith");
    expect(result.data).toContain("status: draft");
  });

  it("keeps uuid and sharedWith from disk when someone else saves", async () => {
    put(HEAD + BODY);
    asUser("bob");

    const result = await saveFrontmatter(
      NOTE,
      ItemTypes.NOTE,
      `uuid: ${FRESH}\nsharedWith: bob:rwd, mallory:rwd\ntitle: Plan\nstatus: final\n`,
    );

    expect(result.data?.uuid).toBe(NOTE);
    const saved = onDisk();
    expect(saved).toContain(`uuid: ${NOTE}`);
    expect(saved).toContain("sharedWith: bob:rw\n");
    expect(saved).not.toContain("mallory");
    expect(mockAnnounce).not.toHaveBeenCalled();
    expect(saved).toContain("status: final");
  });

  it("lets the owner rewrite the frontmatter, keeping every byte of the body", async () => {
    put(HEAD + BODY);

    const result = await saveFrontmatter(
      NOTE,
      ItemTypes.NOTE,
      `uuid: ${NOTE}\ntitle: Plan B\nsharedWith: bob:r\nproject: jotty\n`,
    );

    expect(result.success).toBe(true);
    const saved = onDisk();
    expect(saved.endsWith(`---\n${BODY}`)).toBe(true);
    expect(saved).toContain("title: Plan B");
    expect(saved).toContain("sharedWith: bob:r\n");
    expect(saved).toContain("project: jotty");
    expect(saved).not.toContain("status: draft");
    expect(mockReachable).toHaveBeenCalledWith(NOTE, ItemTypes.NOTE, "alice", PermissionTypes.EDIT);
    expect(mockBroadcast).toHaveBeenCalledWith(expect.objectContaining({ type: "note", entityId: NOTE }));
    expect(mockCommit).toHaveBeenCalledWith("alice", path.join("Home", "plan.md"), "update", "Plan B");
  });

  it("does not touch the file when someone else saves without changing anything", async () => {
    put(HEAD + BODY);
    asUser("bob");
    const current = (await readFrontmatter(NOTE, ItemTypes.NOTE)).data as string;

    const result = await saveFrontmatter(NOTE, ItemTypes.NOTE, current);

    expect(result.success).toBe(true);
    expect(onDisk()).toBe(HEAD + BODY);
    expect(mockBroadcast).not.toHaveBeenCalled();
    expect(mockCommit).not.toHaveBeenCalled();
  });

  it("puts uuid and sharedWith back where they were for someone else's edit", async () => {
    put(HEAD + BODY);
    asUser("bob");

    await saveFrontmatter(NOTE, ItemTypes.NOTE, "title: Plan\ncreatedAt: 2020-01-01T00:00:00.000Z\ntags: [work]\nstatus: final\n");

    const keys = onDisk().split("---")[1].match(/^\w+(?=:)/gm);
    expect(keys).toEqual(["uuid", "title", "createdAt", "tags", "sharedWith", "status"]);
  });

  it("refuses shares the share screen would refuse", async () => {
    put(HEAD + BODY);
    const save = (shares: string) => saveFrontmatter(NOTE, ItemTypes.NOTE, `uuid: ${NOTE}\nsharedWith: ${shares}\n`);

    expect((await save("public:rw")).error).toBe(CustomFieldErrors.SHARE_PUBLIC);
    expect((await save("bob:rwx")).error).toBe(CustomFieldErrors.SHARE_CODE);
    expect((await save("{bob: rw}")).error).toBe(CustomFieldErrors.SHARES_FORMAT);
    expect((await save("alice:rw")).error).toBe("frontmatterShareSelf");
    expect((await save("mallory:r")).error).toBe("frontmatterShareUnknown");
    expect(onDisk()).toBe(HEAD + BODY);
    expect(mockAnnounce).not.toHaveBeenCalled();
  });

  it("tells new receivers and refreshes everyone's shares when the owner edits sharedWith", async () => {
    put(HEAD + BODY);

    const result = await saveFrontmatter(
      NOTE,
      ItemTypes.NOTE,
      `uuid: ${NOTE}\ntitle: Plan\nsharedWith: carol:rw, public:r\n`,
    );

    expect(result.success).toBe(true);
    expect(onDisk()).toContain("sharedWith: carol:rw, public:r\n");
    expect(mockTell.mock.calls).toEqual([
      [Modes.NOTES, NOTE, "alice", "carol"],
      [Modes.NOTES, NOTE, "alice", "public"],
    ]);
    expect(mockAnnounce).toHaveBeenCalledWith(Modes.NOTES, NOTE, ["alice", "bob", "carol", "public"]);
  });

  it("keeps a share it can't parse when the owner leaves it alone", async () => {
    put(HEAD.replace("sharedWith: bob:rw", "sharedWith:\n  bob: rw") + BODY);

    const result = await saveFrontmatter(
      NOTE,
      ItemTypes.NOTE,
      `uuid: ${NOTE}\ntitle: Plan\nsharedWith:\n  bob: rw\nstatus: final\n`,
    );

    expect(result.success).toBe(true);
    expect(mockAnnounce).not.toHaveBeenCalled();
  });

  it("keeps hashtags from the text in tags even when they're removed from the frontmatter", async () => {
    put(HEAD + BODY);

    await saveFrontmatter(NOTE, ItemTypes.NOTE, `uuid: ${NOTE}\ntags: [extra]\n`);

    expect(onDisk()).toContain("tags:\n  - extra\n  - work\n");
  });

  it("moves the item to a new uuid when the owner changes it", async () => {
    put(HEAD + BODY);

    const result = await saveFrontmatter(NOTE, ItemTypes.NOTE, `uuid: ${FRESH}\ntitle: Plan\n`);

    expect(result.data?.uuid).toBe(FRESH);
    expect(onDisk()).toContain(`uuid: ${FRESH}`);
    expect(mockBroadcast).toHaveBeenCalledWith(expect.objectContaining({ entityId: FRESH }));
  });

  it("refuses a uuid another item already has, or one that isn't a uuid", async () => {
    put(HEAD + BODY);
    put(`---\nuuid: ${OTHER}\ntitle: Other\n---\nbody\n`, path.join(root, "data", "checklists", "carol", "list.md"));

    expect((await saveFrontmatter(NOTE, ItemTypes.NOTE, `uuid: ${OTHER}\n`)).error).toBe("frontmatterUuidTaken");
    expect((await saveFrontmatter(NOTE, ItemTypes.NOTE, "uuid: nope\n")).error).toBe(CustomFieldErrors.UUID_INVALID);
    expect((await saveFrontmatter(NOTE, ItemTypes.NOTE, "title: no uuid\n")).error).toBe(CustomFieldErrors.UUID_INVALID);
    expect(onDisk()).toBe(HEAD + BODY);
  });

  it("refuses callers without edit rights", async () => {
    put(HEAD + BODY);
    mockReachable.mockResolvedValue(false);

    const result = await saveFrontmatter(NOTE, ItemTypes.NOTE, `uuid: ${NOTE}\n`);

    expect(result.error).toBe("requiredPermissions");
    expect(onDisk()).toBe(HEAD + BODY);
  });

  it("refuses to write when the file on disk doesn't carry the uuid it was found by", async () => {
    put(HEAD.replace(NOTE, OTHER) + BODY);

    const result = await saveFrontmatter(NOTE, ItemTypes.NOTE, `uuid: ${NOTE}\n`);

    expect(result.error).toBe("frontmatterUnreadable");
    expect(onDisk()).toBe(HEAD.replace(NOTE, OTHER) + BODY);
  });

  it("does not rewrite the file when nothing changed", async () => {
    put(HEAD + BODY);
    const current = (await readFrontmatter(NOTE, ItemTypes.NOTE)).data as string;

    const result = await saveFrontmatter(NOTE, ItemTypes.NOTE, current);

    expect(result.success).toBe(true);
    expect(onDisk()).toBe(HEAD + BODY);
    expect(mockBroadcast).not.toHaveBeenCalled();
  });

  it("keeps the ciphertext of an encrypted note and skips history", async () => {
    const locked = `---\nuuid: ${NOTE}\ntitle: Plan\nencrypted: true\nencryptionMethod: pgp\n---\n-----BEGIN PGP MESSAGE-----\nabc\n-----END PGP MESSAGE-----\n`;
    put(locked);

    const result = await saveFrontmatter(
      NOTE,
      ItemTypes.NOTE,
      `uuid: ${NOTE}\ntitle: Plan\nencrypted: true\nencryptionMethod: pgp\nstatus: final\n`,
    );

    expect(result.success).toBe(true);
    expect(onDisk().endsWith("---\n-----BEGIN PGP MESSAGE-----\nabc\n-----END PGP MESSAGE-----\n")).toBe(true);
    expect(mockCommit).not.toHaveBeenCalled();
  });

  it("rejects broken yaml, non maps and aliases", () => {
    expect(parseCustom("a: [1, 2\n", true)).toEqual({ error: CustomFieldErrors.INVALID_YAML });
    expect(parseCustom("- one\n- two\n", true)).toEqual({ error: CustomFieldErrors.NOT_A_MAP });
    expect(parseCustom(`uuid: ${NOTE}\na: &x [1, 2]\nb: *x\n`, true)).toEqual({ error: CustomFieldErrors.ALIASES });
    expect(parseCustom(`uuid: ${NOTE}\ntags: {a: 1}\n`, true)).toEqual({ error: CustomFieldErrors.TAGS_NOT_LIST });
    expect(parseCustom("", false)).toEqual({ fields: {} });
  });

  it("does not let __proto__ reach the prototype", () => {
    const parsed = parseCustom(`uuid: ${NOTE}\n__proto__:\n  polluted: true\n`, true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect("fields" in parsed).toBe(true);
  });
});
