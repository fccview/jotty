import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import fsp from "fs/promises";
import { existsSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from "fs";

const { home, root, session, commits } = vi.hoisted(() => {
  const os = process.getBuiltinModule("os");
  const fs = process.getBuiltinModule("fs");
  const nodePath = process.getBuiltinModule("path");
  const previous = process.cwd();
  process.chdir(fs.mkdtempSync(nodePath.join(os.tmpdir(), "jotty-attachment-migration-")));
  return {
    home: previous,
    root: process.cwd(),
    session: { user: { username: "root", isAdmin: true } as { username: string; isAdmin: boolean } | null },
    commits: [] as unknown[][],
  };
});

vi.unmock("fs/promises");
vi.unmock("unified");
vi.unmock("unist-util-visit");

vi.mock("@/app/_server/actions/users/auth", () => ({
  isAuthenticated: async () => Boolean(session.user),
  isAdmin: async () => Boolean(session.user?.isAdmin),
  canAccessAllContent: async () => Boolean(session.user?.isAdmin),
}));

vi.mock("@/app/_server/actions/users/queries", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/_server/actions/users/queries")>()),
  getCurrentUser: async () => session.user,
  getUsername: async () => session.user?.username ?? "",
}));

vi.mock("@/app/_server/actions/history/repo", () => ({
  commitNote: async (...args: unknown[]) => {
    commits.push(args);
    return { success: true };
  },
}));

import { migrateAttachments, planAttachmentMigration } from "@/app/_server/actions/migration";
import { itemLane, runQueued } from "@/app/_server/actions/lib/concurrency";
import { invalidatePath } from "@/app/_server/actions/lib/metadata-cache";
import { ResidueKinds } from "@/app/_consts/attachment-migration";
import {
  ALICE_DIARY,
  ALICE_PLAN,
  BOB_BOARD,
  NOBODY,
  dataPath,
  read,
  readUsers,
  stampVersion,
  writeItem,
  writeLegacy,
  writeUsers,
} from "../mock-data/attachment-fixture";

const ORIGIN = "https://notes.example.com";
const att = (uuid: string, name: string) => dataPath("attachments", uuid, name);
const inode = (filePath: string) => statSync(filePath).ino;

const item = (rel: string, uuid: string, body: string, extra = "") => {
  const filePath = writeItem(rel, uuid, body, extra);
  invalidatePath(filePath);
  return filePath;
};

const run = async () => {
  const result = await migrateAttachments();
  if (!result.success) throw new Error(result.error);
  return result.data!;
};

afterAll(() => {
  process.chdir(home);
  rmSync(root, { recursive: true, force: true });
});

beforeEach(() => {
  session.user = { username: "root", isAdmin: true };
  commits.length = 0;
  vi.restoreAllMocks();
  vi.stubEnv("APP_URL", ORIGIN);
  rmSync(dataPath(), { recursive: true, force: true });
  writeUsers([{ username: "alice" }, { username: "bob" }, { username: "root", isAdmin: true }]);
  stampVersion(2);
});

describe("attachments migration", () => {
  it("links every embedded upload into the item folder and rewrites the URLs", async () => {
    const legacy = writeLegacy("alice", "images", "cat.png");
    writeLegacy("alice", "files", "report.pdf");
    writeLegacy("alice", "videos", "clip.mp4");
    const plan = item(
      "notes/alice/Work/plan.md",
      ALICE_PLAN,
      "![cat](/api/image/alice/cat.png)\n\n[📎 report.pdf](/api/file/alice/report.pdf)\n\n[🎥 clip](/api/video/alice/clip.mp4)\n",
    );

    const report = await run();

    expect(read(plan)).toContain(`![cat](/api/attachment/${ALICE_PLAN}/cat.png)`);
    expect(read(plan)).toContain(`[📎 report.pdf](/api/attachment/${ALICE_PLAN}/report.pdf)`);
    expect(read(plan)).toContain(`[🎥 clip](/api/attachment/${ALICE_PLAN}/clip.mp4)`);
    expect(inode(att(ALICE_PLAN, "cat.png"))).toBe(inode(legacy));
    expect(existsSync(legacy)).toBe(true);
    expect(report).toMatchObject({ rewritten: 1, urls: 3, linked: 3, copied: 0 });
    expect(read(dataPath(".schema-version"))).toBe("3");
    expect(commits).toEqual([["alice", "Work/plan.md", "attachments", "plan"]]);
    expect(read(dataPath(".migrations", "attachments-v3.jsonl")).trim().split("\n")).toHaveLength(1);
  });

  it("rewrites card descriptions inside a checklist without breaking the line", async () => {
    writeLegacy("bob", "images", "card.png");
    const board = item(
      "checklists/bob/Boards/board.md",
      BOB_BOARD,
      "- [ ] Card | description:Look ![c](/api/image/bob/card.png)\\nthen go | time:0\n",
    );

    await run();

    expect(read(board)).toContain(
      `- [ ] Card | description:Look ![c](/api/attachment/${BOB_BOARD}/card.png)\\nthen go | time:0\n`,
    );
  });

  it("never touches code", async () => {
    writeLegacy("alice", "images", "cat.png");
    const body = "```\n![cat](/api/image/alice/cat.png)\n```\n\n`![cat](/api/image/alice/cat.png)`\n";
    const plan = item("notes/alice/Work/plan.md", ALICE_PLAN, body);

    expect((await run()).rewritten).toBe(0);
    expect(read(plan)).toContain(body);
  });

  it("leaves encrypted, unstamped and read-only items alone and says so", async () => {
    writeLegacy("alice", "images", "cat.png");
    const encrypted = item("notes/alice/Work/secret.md", ALICE_DIARY, "![cat](/api/image/alice/cat.png)", "encrypted: true\n");
    const unstamped = dataPath("notes", "alice", "Work", "loose.md");
    writeFileSync(unstamped, "---\ntitle: loose\n---\n\n![cat](/api/image/alice/cat.png)");
    const before = [read(encrypted), read(unstamped)];

    const report = await run();

    expect([read(encrypted), read(unstamped)]).toEqual(before);
    expect(report.residue[ResidueKinds.ENCRYPTED]).toEqual(["notes/alice/Work/secret.md"]);
    expect(report.residue[ResidueKinds.LOCKED]).toEqual(["notes/alice/Work/loose.md"]);
  });

  it("leaves both files of a duplicated uuid alone", async () => {
    writeLegacy("alice", "images", "cat.png");
    const first = item("notes/alice/Work/a.md", ALICE_PLAN, "![cat](/api/image/alice/cat.png)");
    const second = item("notes/alice/Work/b.md", ALICE_PLAN, "![cat](/api/image/alice/cat.png)");

    const report = await run();

    expect(read(first)).toContain("/api/image/alice/cat.png");
    expect(read(second)).toContain("/api/image/alice/cat.png");
    expect(report.residue[ResidueKinds.CLASH]).toHaveLength(2);
  });

  it("adopts another user's upload only when that user can edit the item", async () => {
    writeLegacy("bob", "images", "bob.png");
    const readOnly = item("notes/alice/Work/plan.md", ALICE_PLAN, "![b](/api/image/bob/bob.png)", "sharedWith: bob:r\n");
    const editable = item("notes/alice/Work/diary.md", ALICE_DIARY, "![b](/api/image/bob/bob.png)", "sharedWith: bob:rw\n");

    const report = await run();

    expect(read(readOnly)).toContain("/api/image/bob/bob.png");
    expect(read(editable)).toContain(`/api/attachment/${ALICE_DIARY}/bob.png`);
    expect(report.residue[ResidueKinds.CROSS_OWNER]).toEqual(["notes/alice/Work/plan.md: /api/image/bob/bob.png"]);
    expect(report.crossOwner).toEqual(["notes/alice/Work/diary.md <- bob/images/bob.png"]);
  });

  it("reports missing files and never follows a symlink", async () => {
    writeLegacy("alice", "images", "real.png");
    symlinkSync(dataPath("users", "users.json"), dataPath("notes", "alice", "images", "users.png"), "file");
    const plan = item(
      "notes/alice/Work/plan.md",
      ALICE_PLAN,
      "![gone](/api/image/alice/gone.png) ![u](/api/image/alice/users.png) ![t](/api/image/alice/..%2F..%2F..%2Fusers%2Fusers.json)",
    );
    const before = read(plan);

    const report = await run();

    expect(read(plan)).toBe(before);
    expect(report.residue[ResidueKinds.MISSING]).toHaveLength(2);
    expect(report.residue[ResidueKinds.NOT_FILE]).toHaveLength(1);
    expect(existsSync(dataPath("attachments", ALICE_PLAN))).toBe(false);
  });

  it("moves absolute URLs on this instance and leaves other addresses alone", async () => {
    writeLegacy("alice", "images", "cat.png");
    const plan = item(
      "notes/alice/Work/plan.md",
      ALICE_PLAN,
      `![a](${ORIGIN}/api/image/alice/cat.png) ![b](https://elsewhere.test/api/image/alice/cat.png)`,
    );

    const report = await run();

    expect(read(plan)).toContain(`![a](/api/attachment/${ALICE_PLAN}/cat.png)`);
    expect(read(plan)).toContain("![b](https://elsewhere.test/api/image/alice/cat.png)");
    expect(report.residue[ResidueKinds.FOREIGN]).toHaveLength(1);
  });

  it("keeps encoded names with spaces", async () => {
    writeLegacy("alice", "images", "my cat.png");
    const plan = item("notes/alice/Work/plan.md", ALICE_PLAN, "![a](/api/image/alice/my%20cat.png)");

    await run();

    expect(existsSync(att(ALICE_PLAN, "my cat.png"))).toBe(true);
    expect(read(plan)).toContain(`![a](/api/attachment/${ALICE_PLAN}/my%20cat.png)`);
  });

  it("links one upload into every item that embeds it", async () => {
    const legacy = writeLegacy("alice", "images", "cat.png");
    item("notes/alice/Work/plan.md", ALICE_PLAN, "![a](/api/image/alice/cat.png)\n![again](/api/image/alice/cat.png)");
    item("notes/alice/Work/diary.md", ALICE_DIARY, "![a](/api/image/alice/cat.png)");

    const report = await run();

    expect(inode(att(ALICE_PLAN, "cat.png"))).toBe(inode(legacy));
    expect(inode(att(ALICE_DIARY, "cat.png"))).toBe(inode(legacy));
    expect(report).toMatchObject({ rewritten: 2, urls: 3, linked: 2 });
  });

  it("numbers a second file with the same name", async () => {
    writeLegacy("alice", "images", "a.png", "image");
    writeLegacy("alice", "files", "a.png", "file");
    const plan = item("notes/alice/Work/plan.md", ALICE_PLAN, "![a](/api/image/alice/a.png) [f](/api/file/alice/a.png)");

    await run();

    expect(read(att(ALICE_PLAN, "a.png"))).toBe("image");
    expect(read(att(ALICE_PLAN, "a-1.png"))).toBe("file");
    expect(read(plan)).toContain(`[f](/api/attachment/${ALICE_PLAN}/a-1.png)`);
  });

  it("reuses a link left behind by a crash instead of numbering it", async () => {
    const legacy = writeLegacy("alice", "images", "cat.png");
    await fsp.mkdir(dataPath("attachments", ALICE_PLAN), { recursive: true });
    await fsp.link(legacy, att(ALICE_PLAN, "cat.png"));
    item("notes/alice/Work/plan.md", ALICE_PLAN, "![a](/api/image/alice/cat.png)");

    const report = await run();

    expect(report).toMatchObject({ reused: 1, linked: 0 });
    expect(readdirSync(dataPath("attachments", ALICE_PLAN))).toEqual(["cat.png"]);
  });

  it("writes nothing on a second run", async () => {
    writeLegacy("alice", "images", "cat.png");
    const plan = item("notes/alice/Work/plan.md", ALICE_PLAN, "![a](/api/image/alice/cat.png)");
    await run();
    const after = { body: read(plan), mtime: statSync(plan).mtimeMs, journal: read(dataPath(".migrations", "attachments-v3.jsonl")) };

    const again = await run();

    expect(again).toMatchObject({ rewritten: 0, linked: 0 });
    expect({ body: read(plan), mtime: statSync(plan).mtimeMs, journal: read(dataPath(".migrations", "attachments-v3.jsonl")) }).toEqual(after);
  });

  it("dry run reports what it would do and writes nothing", async () => {
    writeLegacy("alice", "images", "cat.png");
    const plan = item("notes/alice/Work/plan.md", ALICE_PLAN, "![a](/api/image/alice/cat.png)");
    const before = read(plan);

    const result = await planAttachmentMigration();

    expect(result.data).toMatchObject({ dryRun: true, rewritten: 1, linked: 1 });
    expect(read(plan)).toBe(before);
    expect(existsSync(dataPath("attachments", ALICE_PLAN))).toBe(false);
    expect(read(dataPath(".schema-version"))).toBe("2");
  });

  it("copies when the disk refuses hardlinks", async () => {
    const legacy = writeLegacy("alice", "images", "cat.png");
    const plan = item("notes/alice/Work/plan.md", ALICE_PLAN, "![a](/api/image/alice/cat.png)");
    vi.spyOn(fsp, "link").mockRejectedValue(Object.assign(new Error("cross-device"), { code: "EXDEV" }));

    const report = await run();

    expect(report).toMatchObject({ linkMode: "copy", copied: 1, linked: 0 });
    expect(read(att(ALICE_PLAN, "cat.png"))).toBe(read(legacy));
    expect(inode(att(ALICE_PLAN, "cat.png"))).not.toBe(inode(legacy));
    expect(read(plan)).toContain(`/api/attachment/${ALICE_PLAN}/cat.png`);
  });

  it("waits for an edit already in the item lane and keeps it", async () => {
    writeLegacy("alice", "images", "cat.png");
    const plan = item("notes/alice/Work/plan.md", ALICE_PLAN, "![a](/api/image/alice/cat.png)");
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const edit = runQueued(itemLane("notes", ALICE_PLAN), async () => {
      await gate;
      await fsp.writeFile(plan, `${read(plan)}\n\nwritten while migrating`);
    });

    const migrating = run();
    await new Promise((resolve) => setTimeout(resolve, 50));
    release();
    await edit;
    await migrating;

    expect(read(plan)).toContain("written while migrating");
    expect(read(plan)).toContain(`/api/attachment/${ALICE_PLAN}/cat.png`);
  });

  it("moves avatars, gives every user a uuid and leaves the rest as they were", async () => {
    writeLegacy("alice", "images", "me.png", "face");
    writeUsers([
      { username: "alice", avatarUrl: "/api/image/alice/me.png" },
      { username: "bob", avatarUrl: "/api/image/bob/gone.png" },
      { username: "carol", avatarUrl: "https://gravatar.example/carol.png" },
      { username: "dave", avatarUrl: "/api/image/alice/me.png" },
      { username: "root", isAdmin: true },
    ]);

    const report = await run();
    const users = readUsers();
    const alice = users.find((user) => user.username === "alice")!;

    expect(users.every((user) => user.uuid)).toBe(true);
    expect(alice.avatarUrl).toMatch(new RegExp(`^/api/avatar/${alice.uuid}\\?v=\\d+$`));
    expect(read(dataPath("attachments", "avatars", `${alice.uuid}.png`))).toBe("face");
    expect(users.find((user) => user.username === "bob")!.avatarUrl).toBe("/api/image/bob/gone.png");
    expect(users.find((user) => user.username === "carol")!.avatarUrl).toBe("https://gravatar.example/carol.png");
    expect(report.avatars).toBe(1);
    expect(report.residue[ResidueKinds.AVATAR_MISSING]).toHaveLength(1);
    expect(report.residue[ResidueKinds.AVATAR_FOREIGN]).toHaveLength(1);
  });

  it("refuses anyone who isn't an admin", async () => {
    session.user = { username: "alice", isAdmin: false };
    expect((await migrateAttachments()).success).toBe(false);
    expect((await planAttachmentMigration()).success).toBe(false);
  });

  it("waits for the sharing migration on a v1 instance", async () => {
    stampVersion(0);
    writeLegacy("alice", "images", "cat.png");
    writeFileSync(dataPath("notes", ".sharing.json"), "{}");

    const result = await migrateAttachments();

    expect(result).toEqual({ success: false, error: "Run the sharing migration first" });
  });
});
