import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "fs";

const { home, root, session } = vi.hoisted(() => {
  const os = process.getBuiltinModule("os");
  const fs = process.getBuiltinModule("fs");
  const nodePath = process.getBuiltinModule("path");
  const previous = process.cwd();
  process.chdir(fs.mkdtempSync(nodePath.join(os.tmpdir(), "jotty-attachments-")));
  return { home: previous, root: process.cwd(), session: { user: null as { username: string; isAdmin: boolean } | null } };
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

vi.mock("@/app/_server/actions/config", () => ({
  getSettings: async () => ({ maximumFileSize: 1024 }),
}));

import {
  adoptRefs,
  attachTo,
  deleteAttachment,
  listAttachments,
  uploadFile,
} from "@/app/_server/actions/attachments";
import { cleanName } from "@/app/_server/actions/attachments/store";
import { rehomeRefs } from "@/app/_server/actions/attachments/adopt";
import { carryAttachments, sweepOrphans } from "@/app/_server/actions/attachments/lifecycle";
import { avatarFileOf, removeAvatar, saveAvatar } from "@/app/_server/actions/attachments/avatars";
import { backfillUserUuids, ensureUserUuid } from "@/app/_server/actions/users/records";
import { needsMigration } from "@/app/_server/actions/lib/migration-check";
import { invalidatePath } from "@/app/_server/actions/lib/metadata-cache";
import { AttachmentErrors, attachmentUrl } from "@/app/_consts/attachments";
import {
  ALICE_DIARY,
  ALICE_PLAN,
  BOB_BOARD,
  NOBODY,
  dataPath,
  read,
  readUsers,
  stampVersion,
  writeAttachment,
  writeItem,
  writeLegacy,
  writeUsers,
} from "../mock-data/attachment-fixture";

const ALICE = { username: "alice", isAdmin: false };
const BOB = { username: "bob", isAdmin: false };
const CAROL = { username: "carol", isAdmin: false };
const DAVE = { username: "dave", isAdmin: false };
const SHOUTY = "77777777-7777-4777-8777-77777777ABCD";

const upload = (itemUuid: string, name: string, content = "data") => {
  const formData = new FormData();
  formData.append("itemUuid", itemUuid);
  formData.append("file", new File([content], name, { type: "image/png" }));
  return uploadFile(formData);
};

const names = (uuid: string): string[] =>
  existsSync(dataPath("attachments", uuid)) ? readdirSync(dataPath("attachments", uuid)).sort() : [];

afterAll(() => {
  process.chdir(home);
  rmSync(root, { recursive: true, force: true });
});

beforeEach(() => {
  session.user = null;
  rmSync(dataPath(), { recursive: true, force: true });
  [
    writeItem("notes/alice/Work/plan.md", ALICE_PLAN, "plan", "sharedWith: bob:r\n"),
    writeItem("notes/alice/Private/diary.md", ALICE_DIARY, "diary", "sharedWith: carol:rw, dave:rwd\n"),
    writeItem("checklists/bob/Boards/board.md", BOB_BOARD, "- [ ] card"),
  ].forEach(invalidatePath);
});

describe("uploadFile", () => {
  it("stores the file in the item's folder and answers with its attachment URL", async () => {
    session.user = ALICE;
    const result = await upload(ALICE_PLAN, "cat.png");

    expect(result.success).toBe(true);
    expect(result.data?.url).toBe(`/api/attachment/${ALICE_PLAN}/cat.png`);
    expect(read(dataPath("attachments", ALICE_PLAN, "cat.png"))).toBe("data");
  });

  it("numbers a clashing name instead of overwriting it", async () => {
    session.user = ALICE;
    await upload(ALICE_PLAN, "cat.png", "one");
    const second = await upload(ALICE_PLAN, "cat.png", "two");

    expect(second.data?.fileName).toBe("cat-1.png");
    expect(read(dataPath("attachments", ALICE_PLAN, "cat.png"))).toBe("one");
  });

  it("refuses someone who can only read the item", async () => {
    session.user = BOB;
    expect(await upload(ALICE_PLAN, "cat.png")).toEqual({ success: false, error: AttachmentErrors.DENIED });
    expect(names(ALICE_PLAN)).toEqual([]);
  });

  it("lets an editor upload", async () => {
    session.user = CAROL;
    expect((await upload(ALICE_DIARY, "cat.png")).success).toBe(true);
  });

  it("refuses without a session, for an unknown item, and past the size limit", async () => {
    expect((await upload(ALICE_PLAN, "cat.png")).error).toBe(AttachmentErrors.UNAUTHENTICATED);
    session.user = ALICE;
    expect((await upload(NOBODY, "cat.png")).error).toBe(AttachmentErrors.NOT_FOUND);
    expect((await upload(ALICE_PLAN, "big.png", "x".repeat(2048))).error).toBe(AttachmentErrors.TOO_LARGE);
  });

  it("files an item with an uppercase uuid under the lowercase folder its URL points at", async () => {
    invalidatePath(writeItem("notes/alice/Work/shouty.md", SHOUTY));
    session.user = ALICE;
    const result = await upload(SHOUTY, "cat.png");

    expect(result.data?.url).toBe(`/api/attachment/${SHOUTY.toLowerCase()}/cat.png`);
    expect(readdirSync(dataPath("attachments"))).toEqual([SHOUTY.toLowerCase()]);
    expect((await listAttachments(SHOUTY)).data?.map((file) => file.url)).toEqual([result.data?.url]);
  });

  it("keeps the upload inside the item folder whatever it is called", async () => {
    session.user = ALICE;
    for (const name of ["../../users/users.json", "..\\..\\evil.png", ".env", "a/b/c.png", "100%.png"]) {
      expect((await upload(ALICE_PLAN, name)).success).toBe(true);
    }
    expect(existsSync(dataPath("users", "users.json"))).toBe(false);
    expect(names(ALICE_PLAN)).toEqual(["100-.png", "c.png", "env", "evil.png", "users.json"]);
  });
});

describe("cleanName", () => {
  it("keeps readable names, unicode included", () => {
    expect(cleanName("Holiday photo (1).png")).toBe("Holiday photo (1).png");
    expect(cleanName("照片.png")).toBe("照片.png");
    expect(cleanName("...")).toBe("file");
  });

  it("clips long names by bytes, never past the filesystem limit", () => {
    const clipped = cleanName(`${"照".repeat(150)}.png`);

    expect(clipped.endsWith(".png")).toBe(true);
    expect(Buffer.byteLength(clipped)).toBeLessThanOrEqual(180);
  });

  it("never splits an emoji or keeps a stray surrogate", () => {
    const clipped = cleanName(`${"😀".repeat(100)}.png`);

    expect(Array.from(clipped.slice(0, -4)).every((char) => char === "😀")).toBe(true);
    expect(cleanName("broken\uD83D.png")).toBe("broken.png");
    expect(() => attachmentUrl(ALICE_PLAN, clipped)).not.toThrow();
  });

  it("encodes brackets so a markdown link doesn't end early", () => {
    expect(attachmentUrl(ALICE_PLAN, "smile :).png")).toBe(`/api/attachment/${ALICE_PLAN}/smile%20%3A%29.png`);
  });
});

describe("listAttachments and deleteAttachment", () => {
  beforeEach(() => {
    writeAttachment(ALICE_PLAN, "x.png");
  });

  it("lists for readers and refuses everyone else", async () => {
    session.user = BOB;
    expect((await listAttachments(ALICE_PLAN)).data?.map((file) => file.name)).toEqual(["x.png"]);
    session.user = CAROL;
    expect((await listAttachments(ALICE_PLAN)).error).toBe(AttachmentErrors.DENIED);
  });

  it("deletes only for the owner and people holding the delete grant", async () => {
    session.user = BOB;
    expect((await deleteAttachment(ALICE_PLAN, "x.png")).error).toBe(AttachmentErrors.DENIED);
    session.user = ALICE;
    expect((await deleteAttachment(ALICE_PLAN, "x.png")).success).toBe(true);
    expect(existsSync(dataPath("attachments", ALICE_PLAN))).toBe(false);
  });

  it("lets an editor upload but not delete", async () => {
    writeAttachment(ALICE_DIARY, "page.png");
    session.user = CAROL;
    expect((await deleteAttachment(ALICE_DIARY, "page.png")).error).toBe(AttachmentErrors.DENIED);
    expect(names(ALICE_DIARY)).toEqual(["page.png"]);
    session.user = DAVE;
    expect((await deleteAttachment(ALICE_DIARY, "page.png")).success).toBe(true);
  });

  it.each([
    "../../notes/alice/Work/plan.md",
    "../../../users/users.json",
    "..",
    ".hidden",
    "a/b",
    "/etc/passwd",
    "..%2F..%2Fbob%2Fnote.md",
    "%2e%2e%2f%2e%2e%2fusers.json",
    "..%5C..%5Cusers.json",
    "..\\..\\users.json",
    "x.png\0.md",
    "x.png%00",
    "%E0%A4%A",
  ])("refuses to delete %s and removes nothing", async (name) => {
    session.user = ALICE;
    expect((await deleteAttachment(ALICE_PLAN, name)).success).toBe(false);
    expect(existsSync(dataPath("notes", "alice", "Work", "plan.md"))).toBe(true);
    expect(names(ALICE_PLAN)).toEqual(["x.png"]);
  });

  it("refuses without a session, refuses a folder and reports a missing file", async () => {
    expect((await deleteAttachment(ALICE_PLAN, "x.png")).error).toBe(AttachmentErrors.UNAUTHENTICATED);
    session.user = ALICE;
    mkdirSync(dataPath("attachments", ALICE_PLAN, "nested"));
    expect((await deleteAttachment(ALICE_PLAN, "nested")).error).toBe(AttachmentErrors.NOT_FOUND);
    expect((await deleteAttachment(ALICE_PLAN, "gone.png")).error).toBe(AttachmentErrors.NOT_FOUND);
    expect(names(ALICE_PLAN)).toEqual(["nested", "x.png"]);
  });
});

describe("attachTo", () => {
  beforeEach(() => {
    writeAttachment(ALICE_PLAN, "x.png");
  });

  it("hardlinks a file the actor can read into an item they can edit", async () => {
    session.user = BOB;
    const result = await attachTo(BOB_BOARD, ALICE_PLAN, "x.png");

    expect(result.data?.url).toBe(`/api/attachment/${BOB_BOARD}/x.png`);
    expect(statSync(dataPath("attachments", BOB_BOARD, "x.png")).ino).toBe(
      statSync(dataPath("attachments", ALICE_PLAN, "x.png")).ino,
    );
  });

  it("refuses a source the actor can't read", async () => {
    session.user = CAROL;
    expect((await attachTo(ALICE_DIARY, ALICE_PLAN, "x.png")).error).toBe(AttachmentErrors.DENIED);
    expect(names(ALICE_DIARY)).toEqual([]);
  });

  it("refuses a target the actor can't edit", async () => {
    session.user = BOB;
    writeAttachment(BOB_BOARD, "y.png");
    expect((await attachTo(ALICE_PLAN, BOB_BOARD, "y.png")).error).toBe(AttachmentErrors.DENIED);
  });
});

describe("bringing other items' attachments along", () => {
  beforeEach(() => {
    writeAttachment(ALICE_PLAN, "x.png");
  });

  it("links a pasted attachment into the item being saved and points the URL there", async () => {
    const body = `![x](/api/attachment/${ALICE_PLAN}/x.png) and \`/api/attachment/${ALICE_PLAN}/x.png\``;
    const rehomed = await rehomeRefs(BOB_BOARD, "bob", body);

    expect(rehomed).toBe(`![x](/api/attachment/${BOB_BOARD}/x.png) and \`/api/attachment/${ALICE_PLAN}/x.png\``);
    expect(statSync(dataPath("attachments", BOB_BOARD, "x.png")).ino).toBe(
      statSync(dataPath("attachments", ALICE_PLAN, "x.png")).ino,
    );
  });

  it("leaves a URL alone when the editor can't read where it came from", async () => {
    const body = `![x](/api/attachment/${ALICE_PLAN}/x.png)`;
    expect(await rehomeRefs(ALICE_DIARY, "carol", body)).toBe(body);
    expect(names(ALICE_DIARY)).toEqual([]);
  });

  it("does the same for encrypted notes through the client, behind the edit grant", async () => {
    const url = `/api/attachment/${ALICE_PLAN}/x.png`;
    session.user = BOB;
    expect((await adoptRefs(ALICE_PLAN, [url])).error).toBe(AttachmentErrors.DENIED);
    expect((await adoptRefs(BOB_BOARD, [url])).data).toEqual({ [url]: `/api/attachment/${BOB_BOARD}/x.png` });
  });
});

describe("item lifecycle", () => {
  it("carries attachments to a copy and points its URLs there", async () => {
    writeAttachment(ALICE_PLAN, "x.png");
    const body = `![x](/api/attachment/${ALICE_PLAN}/x.png)`;

    const copied = await carryAttachments(ALICE_PLAN, NOBODY, body);

    expect(copied).toBe(`![x](/api/attachment/${NOBODY}/x.png)`);
    expect(names(NOBODY)).toEqual(["x.png"]);
  });

  it("leaves the URLs alone when there was nothing to carry", async () => {
    const body = `![x](/api/attachment/${ALICE_PLAN}/x.png)`;
    expect(await carryAttachments(ALICE_PLAN, NOBODY, body)).toBe(body);
  });

  it("keeps a deleted item's folder while another item still embeds it", async () => {
    writeAttachment(NOBODY, "orphan.png");
    invalidatePath(writeItem("notes/alice/Work/copy.md", "88888888-8888-4888-8888-888888888888", `![o](/api/attachment/${NOBODY}/orphan.png)`));

    expect(await sweepOrphans([NOBODY])).toBe(0);
    expect(names(NOBODY)).toEqual(["orphan.png"]);
  });

  it("removes the folders of items that are gone and keeps the rest", async () => {
    writeAttachment(ALICE_PLAN, "x.png");
    writeAttachment(NOBODY, "orphan.png");

    expect(await sweepOrphans([ALICE_PLAN, NOBODY])).toBe(1);
    expect(names(ALICE_PLAN)).toEqual(["x.png"]);
    expect(existsSync(dataPath("attachments", NOBODY))).toBe(false);
  });
});

describe("user uuids and avatars", () => {
  it("gives every user exactly one uuid and keeps it", async () => {
    writeUsers([{ username: "alice" }, { username: "bob", uuid: BOB_BOARD }]);

    expect(await backfillUserUuids()).toBe(1);
    const first = readUsers();
    expect(await backfillUserUuids()).toBe(0);
    expect(readUsers()).toEqual(first);
    expect(first[1].uuid).toBe(BOB_BOARD);
    expect(await ensureUserUuid("alice")).toBe(first[0].uuid);
  });

  it("replaces an avatar and drops the old extension", async () => {
    await saveAvatar(NOBODY, ".png", Buffer.from("png"));
    await saveAvatar(NOBODY, ".jpg", Buffer.from("jpg"));

    expect(readdirSync(dataPath("attachments", "avatars"))).toEqual([`${NOBODY}.jpg`]);
    expect(await avatarFileOf(NOBODY)).toBe(dataPath("attachments", "avatars", `${NOBODY}.jpg`));

    await removeAvatar(NOBODY);
    expect(await avatarFileOf(NOBODY)).toBeNull();
  });

  it("refuses an avatar that isn't an image", async () => {
    await expect(saveAvatar(NOBODY, ".html", Buffer.from("<script>"))).rejects.toThrow();
  });
});

describe("the migration gate", () => {
  it("stamps v3 and backfills uuids when there is nothing to move", async () => {
    writeUsers([{ username: "alice" }]);
    stampVersion(2);

    expect(await needsMigration()).toBe(false);
    expect(read(dataPath(".schema-version"))).toBe("3");
    expect(readUsers()[0].uuid).toBeTruthy();
  });

  it("notices a stamp written behind its back, like a restored backup", async () => {
    writeUsers([{ username: "alice" }]);
    stampVersion(2);
    expect(await needsMigration()).toBe(false);

    writeLegacy("alice", "images", "old.png");
    stampVersion(2);
    expect(await needsMigration()).toBe(true);
  });

  it("blocks a v2 instance with legacy uploads", async () => {
    writeUsers([{ username: "alice" }]);
    writeLegacy("alice", "images", "old.png");
    stampVersion(2);

    expect(await needsMigration()).toBe(true);
    expect(read(dataPath(".schema-version"))).toBe("2");
  });
});
