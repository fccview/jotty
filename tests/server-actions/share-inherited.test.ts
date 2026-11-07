import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import path from "path";
import { mkdirSync, rmSync, writeFileSync } from "fs";

const { home, root, actor } = vi.hoisted(() => {
  const os = process.getBuiltinModule("os");
  const fs = process.getBuiltinModule("fs");
  const nodePath = process.getBuiltinModule("path");
  const previous = process.cwd();

  process.chdir(fs.mkdtempSync(nodePath.join(os.tmpdir(), "jotty-share-inherited-")));

  return { home: previous, root: process.cwd(), actor: { username: "alice" } };
});

vi.unmock("fs/promises");
vi.unmock("@/app/_utils/checklist-utils");

vi.mock("@/app/_server/actions/ws/broadcast", () => ({
  broadcast: vi.fn(),
}));

vi.mock("@/app/_server/actions/log", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
  logContentEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/app/_server/actions/users/queries", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/_server/actions/users/queries")>()),
  getUsername: async () => actor.username,
  getCurrentUser: async () => ({ username: actor.username }),
}));

vi.mock("@/app/_server/actions/users/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/_server/actions/users/auth")>()),
  canAccessAllContent: async () => false,
}));

import { folderShares, itemShares } from "@/app/_server/actions/share/lookups";
import { canReachFile } from "@/app/_server/actions/share/access";
import { dropMounts } from "@/app/_server/actions/share/mounts";
import { ItemTypes, Modes, PermissionTypes } from "@/app/_types/enums";
import { DATA_DIR, USERS_FILE } from "@/app/_consts/files";
import { CATEGORY_INFO_FILE, PUBLIC_USER } from "@/app/_consts/sharing";

const NOTE = "a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1";
const READ = { canRead: true, canEdit: false, canDelete: false, canCreate: false };
const FULL = { canRead: true, canEdit: true, canDelete: true, canCreate: true };

const dirOf = (category: string): string =>
  path.join(root, DATA_DIR, Modes.NOTES, "alice", category);

const notePath = (category: string): string => path.join(dirOf(category), "one.md");

const folder = (
  category: string,
  users: Record<string, object> = {},
  inherit = true,
) => {
  mkdirSync(dirOf(category), { recursive: true });
  writeFileSync(
    path.join(dirOf(category), CATEGORY_INFO_FILE),
    JSON.stringify({ uuid: `${category}-uuid`, sharing: { users, inherit } }),
  );
};

const writeNote = (category: string) => {
  mkdirSync(dirOf(category), { recursive: true });
  writeFileSync(
    notePath(category),
    ["---", `uuid: ${NOTE}`, "title: One", "---", "body", ""].join("\n"),
  );
};

afterAll(() => {
  process.chdir(home);
  rmSync(root, { recursive: true, force: true });
});

beforeEach(() => {
  actor.username = "alice";
  rmSync(path.join(root, DATA_DIR), { recursive: true, force: true });
  dropMounts(Modes.NOTES);
  mkdirSync(path.dirname(path.join(root, USERS_FILE)), { recursive: true });
  writeFileSync(
    path.join(root, USERS_FILE),
    JSON.stringify([{ username: "alice" }, { username: "bob" }, { username: "carol" }]),
  );
});

describe("A subfolder's share dialog", () => {
  it("shows who reaches it through the parent folder", async () => {
    folder("ShareZ", { bob: READ });
    folder("ShareZ/Sub");

    expect(await folderShares(Modes.NOTES, "ShareZ/Sub")).toMatchObject({
      users: {},
      inherited: [{ category: "ShareZ", users: { bob: READ }, isPublic: false }],
    });
  });

  it("keeps its own shares apart from the inherited ones", async () => {
    folder("ShareZ", { bob: READ });
    folder("ShareZ/Sub", { carol: FULL });

    const shares = await folderShares(Modes.NOTES, "ShareZ/Sub");

    expect(shares.users).toEqual({ carol: FULL });
    expect(shares.inherited).toEqual([
      { category: "ShareZ", users: { bob: READ }, isPublic: false },
    ]);
  });

  it("lists every ancestor that grants access, nearest first", async () => {
    folder("ShareZ", { bob: READ });
    folder("ShareZ/Mid", { carol: FULL });
    folder("ShareZ/Mid/Leaf");

    expect((await folderShares(Modes.NOTES, "ShareZ/Mid/Leaf")).inherited).toEqual([
      { category: "ShareZ/Mid", users: { carol: FULL }, isPublic: false },
      { category: "ShareZ", users: { bob: READ }, isPublic: false },
    ]);
  });

  it("stops at an intermediate folder that doesn't inherit, like access does", async () => {
    folder("ShareZ", { bob: READ });
    folder("ShareZ/Mid", { carol: FULL }, false);
    folder("ShareZ/Mid/Leaf");
    writeNote("ShareZ/Mid/Leaf");

    expect((await folderShares(Modes.NOTES, "ShareZ/Mid/Leaf")).inherited).toEqual([
      { category: "ShareZ/Mid", users: { carol: FULL }, isPublic: false },
    ]);

    const leafNote = notePath("ShareZ/Mid/Leaf");
    expect(await canReachFile(Modes.NOTES, leafNote, "bob", PermissionTypes.READ)).toBe(false);
    expect(await canReachFile(Modes.NOTES, leafNote, "carol", PermissionTypes.READ)).toBe(true);
  });

  it("inherits nothing when the folder itself opts out", async () => {
    folder("ShareZ", { bob: READ });
    folder("ShareZ/Sub", { carol: READ }, false);

    const shares = await folderShares(Modes.NOTES, "ShareZ/Sub");

    expect(shares.inherited).toEqual([]);
    expect(shares.inherit).toBe(false);
  });

  it("skips a parent that shares nothing on the way up", async () => {
    folder("ShareZ", { bob: READ });
    folder("ShareZ/Mid");
    folder("ShareZ/Mid/Leaf");

    expect((await folderShares(Modes.NOTES, "ShareZ/Mid/Leaf")).inherited).toEqual([
      { category: "ShareZ", users: { bob: READ }, isPublic: false },
    ]);
  });

  it("says a parent is public without listing the public user as a person", async () => {
    folder("ShareZ", { bob: READ, [PUBLIC_USER]: READ });
    folder("ShareZ/Sub");

    expect((await folderShares(Modes.NOTES, "ShareZ/Sub")).inherited).toEqual([
      { category: "ShareZ", users: { bob: READ }, isPublic: true },
    ]);
  });

  it("has nothing inherited for a top level folder", async () => {
    folder("ShareZ", { bob: READ });

    expect(await folderShares(Modes.NOTES, "ShareZ")).toMatchObject({
      users: { bob: READ },
      inherited: [],
    });
  });

  it("won't show a recipient who else the owner shared with", async () => {
    folder("ShareZ", { bob: READ, carol: READ });
    folder("ShareZ/Sub", { carol: FULL });
    actor.username = "bob";

    for (const category of ["ShareZ", "ShareZ/Sub"]) {
      expect(await folderShares(Modes.NOTES, category)).toEqual({
        users: {},
        isPublic: false,
        inherit: true,
        inherited: [],
      });
    }
  });
});

describe("An item's share dialog inside a shared folder", () => {
  it("names the ancestor the item follows, however deep it sits", async () => {
    folder("ShareZ", { bob: READ });
    folder("ShareZ/Sub");
    writeNote("ShareZ/Sub");

    expect(await itemShares(NOTE, ItemTypes.NOTE)).toMatchObject({
      users: { bob: READ },
      inherited: true,
      sharedParent: "ShareZ",
    });
  });
});
