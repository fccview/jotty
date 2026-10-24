import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import path from "path";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";

const { home, root } = vi.hoisted(() => {
  const os = process.getBuiltinModule("os");
  const fs = process.getBuiltinModule("fs");
  const nodePath = process.getBuiltinModule("path");
  const previous = process.cwd();

  process.chdir(fs.mkdtempSync(nodePath.join(os.tmpdir(), "jotty-share-grants-")));

  return { home: previous, root: process.cwd() };
});

vi.unmock("fs/promises");

vi.mock("@/app/_server/actions/ws/broadcast", () => ({ broadcast: vi.fn() }));
vi.mock("@/app/_server/actions/history/repo", () => ({
  commitNote: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/app/_server/actions/log", () => ({
  logContentEvent: vi.fn().mockResolvedValue(undefined),
  logAudit: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/app/_server/actions/notifications/internal", () => ({
  notifyUser: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@/app/_server/actions/relations/tidy", () => ({
  tidyItemLinks: async (content: string) => content,
  refreshWikilinks: (content: string) => content,
}));
vi.mock("@/app/_server/actions/users", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/_server/actions/users")>()),
  canAccessAllContent: async () => false,
  getCurrentUser: async () => null,
}));

import {
  NO_SUCH_USER,
  NOT_OWNER,
  OWN_ITEM,
  PUBLIC_READ_ONLY,
  Sharer,
  grantItem,
  revokeItem,
} from "@/app/_server/actions/share/grants";
import { editNote } from "@/app/_server/actions/note/editor";
import { dropMounts } from "@/app/_server/actions/share/mounts";
import { extractYamlMetadata } from "@/app/_utils/yaml-metadata-utils";
import { parseSharedWith } from "@/app/_utils/sharing-utils";
import { pathUuid } from "@/app/_server/actions/lib/read-only";
import { CATEGORY_INFO_FILE, PUBLIC_USER } from "@/app/_consts/sharing";
import { DATA_DIR, USERS_FILE } from "@/app/_consts/files";
import { Modes } from "@/app/_types/enums";
import type { SanitisedUser, SharingPermissions } from "@/app/_types";

const NOTE = "5a5a5a5a-5a5a-4a5a-8a5a-5a5a5a5a5a5a";
const ALICE: SanitisedUser = {
  username: "alice",
  isAdmin: false,
  fileRenameMode: "minimal",
  preferredDateFormat: "dd/mm/yyyy",
  preferredTimeFormat: "24-hours",
};
const BOB: Sharer = { username: "bob", isAdmin: false };
const ADMIN: Sharer = { username: "root", isAdmin: true };
const READ: SharingPermissions = { canRead: true, canEdit: false, canDelete: false };
const WRITE: SharingPermissions = { canRead: true, canEdit: true, canDelete: false };

const noteFile = path.join(root, DATA_DIR, Modes.NOTES, "alice", "Work", "plan.md");

const sharedWith = (): unknown =>
  extractYamlMetadata(readFileSync(noteFile, "utf-8")).metadata.sharedWith;

const edit = (content: string) => {
  const formData = new FormData();
  formData.append("uuid", NOTE);
  formData.append("title", "Plan");
  formData.append("content", content);
  formData.append("category", "Work");
  return editNote(ALICE, formData);
};

afterAll(() => {
  process.chdir(home);
  rmSync(root, { recursive: true, force: true });
});

beforeEach(() => {
  rmSync(path.join(root, DATA_DIR), { recursive: true, force: true });
  dropMounts(Modes.NOTES);
  mkdirSync(path.dirname(path.join(root, USERS_FILE)), { recursive: true });
  writeFileSync(
    path.join(root, USERS_FILE),
    JSON.stringify([{ username: "alice" }, { username: "bob" }, { username: "root", isAdmin: true }]),
  );
  mkdirSync(path.dirname(noteFile), { recursive: true });
  writeFileSync(noteFile, ["---", `uuid: ${NOTE}`, "title: Plan", "---", "first", ""].join("\n"));
});

describe("Granting an item to someone", () => {
  it("writes the grant into the owner's file and returns who holds it", async () => {
    const result = await grantItem(ALICE, Modes.NOTES, NOTE, "bob", WRITE);

    expect(result).toEqual({ success: true, data: { bob: WRITE } });
    expect(sharedWith()).toBe("bob:rw");
  });

  it("replaces what the person already had", async () => {
    await grantItem(ALICE, Modes.NOTES, NOTE, "bob", WRITE);
    await grantItem(ALICE, Modes.NOTES, NOTE, "bob", READ);

    expect(sharedWith()).toBe("bob:r");
  });

  it("refuses anyone but the owner", async () => {
    const result = await grantItem(BOB, Modes.NOTES, NOTE, "bob", WRITE);

    expect(result).toEqual({ success: false, error: NOT_OWNER });
    expect(sharedWith()).toBeUndefined();
  });

  it("lets an admin act for the owner", async () => {
    expect(await grantItem(ADMIN, Modes.NOTES, NOTE, "bob", READ)).toMatchObject({ success: true });
    expect(sharedWith()).toBe("bob:r");
  });

  it.each([
    ["a username nobody has", "mallory", READ, NO_SUCH_USER],
    ["the owner themselves", "alice", READ, OWN_ITEM],
    ["an editable public link", PUBLIC_USER, WRITE, PUBLIC_READ_ONLY],
  ])("refuses %s", async (_label, receiver, permissions, error) => {
    expect(await grantItem(ALICE, Modes.NOTES, NOTE, receiver, permissions)).toEqual({
      success: false,
      error,
    });
    expect(sharedWith()).toBeUndefined();
  });
});

describe("Granting an item that inherits its folder's shares", () => {
  beforeEach(() => {
    writeFileSync(
      path.join(path.dirname(noteFile), CATEGORY_INFO_FILE),
      JSON.stringify({ sharing: { users: { root: WRITE }, inherit: true } }),
    );
    dropMounts(Modes.NOTES);
  });

  it("keeps everyone the folder already gave it to", async () => {
    const result = await grantItem(ALICE, Modes.NOTES, NOTE, "bob", READ);

    expect(result).toEqual({ success: true, data: { root: WRITE, bob: READ } });
    expect(parseSharedWith(sharedWith())?.users).toEqual({ root: WRITE, bob: READ });
  });
});

describe("Revoking a grant", () => {
  it("drops only that person", async () => {
    await grantItem(ALICE, Modes.NOTES, NOTE, "bob", WRITE);
    await grantItem(ALICE, Modes.NOTES, NOTE, PUBLIC_USER, READ);

    const result = await revokeItem(ALICE, Modes.NOTES, NOTE, "bob");

    expect(result).toEqual({ success: true, data: { [PUBLIC_USER]: READ } });
    expect(sharedWith()).toBe(`${PUBLIC_USER}:r`);
  });

  it("leaves the file alone when the person holds nothing", async () => {
    const before = readFileSync(noteFile, "utf-8");

    expect(await revokeItem(ALICE, Modes.NOTES, NOTE, "bob")).toMatchObject({ success: true });
    expect(readFileSync(noteFile, "utf-8")).toBe(before);
  });

  it("treats object keys as usernames nobody holds", async () => {
    await grantItem(ALICE, Modes.NOTES, NOTE, "bob", WRITE);
    const before = readFileSync(noteFile, "utf-8");

    expect(await revokeItem(ALICE, Modes.NOTES, NOTE, "__proto__")).toEqual({
      success: true,
      data: { bob: WRITE },
    });
    expect(readFileSync(noteFile, "utf-8")).toBe(before);
  });

  it("refuses anyone but the owner", async () => {
    await grantItem(ALICE, Modes.NOTES, NOTE, "bob", WRITE);

    expect(await revokeItem(BOB, Modes.NOTES, NOTE, "bob")).toEqual({ success: false, error: NOT_OWNER });
    expect(sharedWith()).toBe("bob:rw");
  });
});

describe("Editing a shared note", () => {
  it("keeps the share when the content is replaced", async () => {
    await grantItem(ALICE, Modes.NOTES, NOTE, "bob", WRITE);

    expect(await edit("rewritten by a script")).toMatchObject({ success: true });

    expect(sharedWith()).toBe("bob:rw");
    expect(readFileSync(noteFile, "utf-8")).toContain("rewritten by a script");
  });

  it("keeps both the share and the edit when they land at the same time", async () => {
    const [shared, edited] = await Promise.all([
      grantItem(ALICE, Modes.NOTES, NOTE, "bob", WRITE),
      edit("written while sharing"),
    ]);

    expect(shared).toMatchObject({ success: true });
    expect(edited).toMatchObject({ success: true });
    expect(sharedWith()).toBe("bob:rw");
    expect(readFileSync(noteFile, "utf-8")).toContain("written while sharing");
  });
});

describe("A locked item in a shared folder", () => {
  const lockedFile = path.join(path.dirname(noteFile), "broken.md");
  const broken = ["---", "title: [broken", "tags: : :", 'note: "unterminated', "---", "body", ""].join("\n");

  beforeEach(() => {
    writeFileSync(lockedFile, broken);
    writeFileSync(
      path.join(path.dirname(noteFile), CATEGORY_INFO_FILE),
      JSON.stringify({ sharing: { users: { bob: WRITE, root: READ }, inherit: true } }),
    );
    dropMounts(Modes.NOTES);
  });

  it("refuses to rewrite its frontmatter when someone is removed", async () => {
    const result = await revokeItem(ALICE, Modes.NOTES, pathUuid(lockedFile), "bob");

    expect(result.success).toBe(false);
    expect(readFileSync(lockedFile, "utf-8")).toBe(broken);
  });

  it("refuses to share it", async () => {
    const result = await grantItem(ALICE, Modes.NOTES, pathUuid(lockedFile), "bob", READ);

    expect(result.success).toBe(false);
    expect(readFileSync(lockedFile, "utf-8")).toBe(broken);
  });
});

describe("Parsing grants from a hand-edited file", () => {
  it("keeps object keys as plain usernames", () => {
    const parsed = parseSharedWith("__proto__:rw, constructor:r, bob:r");

    expect(Object.keys(parsed!.users)).toEqual(["__proto__", "constructor", "bob"]);
    expect(Object.getPrototypeOf(parsed!.users)).toBeNull();
    expect(parsed!.users.toString).toBeUndefined();
  });
});
