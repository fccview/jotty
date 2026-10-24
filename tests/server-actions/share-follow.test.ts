import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import path from "path";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";

const { home, root, actor } = vi.hoisted(() => {
  const os = process.getBuiltinModule("os");
  const fs = process.getBuiltinModule("fs");
  const nodePath = process.getBuiltinModule("path");
  const previous = process.cwd();

  process.chdir(fs.mkdtempSync(nodePath.join(os.tmpdir(), "jotty-share-follow-")));

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

vi.mock("@/app/_server/actions/users", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/_server/actions/users")>()),
  canAccessAllContent: async () => false,
  getUsername: async () => actor.username,
  getCurrentUser: async () => ({ username: actor.username }),
}));

import {
  detachItem,
  inheritItem,
  leaveItem,
  shareItem,
  unshareItem,
} from "@/app/_server/actions/share/operations";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { itemShares } from "@/app/_server/actions/share/queries";
import { canReachFile } from "@/app/_server/actions/share/access";
import { dropMounts } from "@/app/_server/actions/share/mounts";
import { extractYamlMetadata } from "@/app/_utils/yaml-metadata-utils";
import { ItemTypes, Modes, PermissionTypes } from "@/app/_types/enums";
import { DATA_DIR, USERS_FILE } from "@/app/_consts/files";
import {
  CATEGORY_INFO_FILE,
  DETACH_LOSSY,
  NO_SHARED_PARENT,
  PUBLIC_USER,
} from "@/app/_consts/sharing";

const NOTE = "91919191-9191-4191-8191-919191919191";
const FOLDER = "Recipes";
const READ = { canRead: true, canEdit: false, canDelete: false, canCreate: false };
const FULL = { canRead: true, canEdit: true, canDelete: true, canCreate: true };
const DELETE_ONLY = { canRead: true, canEdit: false, canDelete: true, canCreate: false };
const PEOPLE = ["bob", "carol", "dave", PUBLIC_USER];
const ASKS = [PermissionTypes.READ, PermissionTypes.EDIT, PermissionTypes.DELETE];

const folderDir = (category = FOLDER): string =>
  path.join(root, DATA_DIR, Modes.NOTES, "alice", category);

const notePath = (category = FOLDER): string => path.join(folderDir(category), "cake.md");

const writeNote = (frontmatter: string[] = [], category = FOLDER) => {
  mkdirSync(folderDir(category), { recursive: true });
  writeFileSync(
    notePath(category),
    ["---", `uuid: ${NOTE}`, "title: Cake", ...frontmatter, "---", "flour", ""].join("\n"),
  );
};

const shareFolder = (users: Record<string, object>) =>
  writeFileSync(
    path.join(folderDir(), CATEGORY_INFO_FILE),
    JSON.stringify({ uuid: "recipes-uuid", sharing: { users, inherit: true } }),
  );

const accessMap = async (category = FOLDER) => {
  const map: Record<string, boolean[]> = {};
  for (const person of PEOPLE) {
    map[person] = await Promise.all(
      ASKS.map((ask) => canReachFile(Modes.NOTES, notePath(category), person, ask)),
    );
  }
  return map;
};

const sharedWithOf = (category = FOLDER): unknown =>
  extractYamlMetadata(readFileSync(notePath(category), "utf-8")).metadata.sharedWith;

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

describe("Following a folder's sharing", () => {
  it("keeps everybody's access identical when an item stops following its folder", async () => {
    writeNote();
    shareFolder({ bob: READ, carol: FULL, [PUBLIC_USER]: READ });
    const before = await accessMap();

    const result = await detachItem(Modes.NOTES, NOTE);

    expect(result.success).toBe(true);
    expect(sharedWithOf()).toBeDefined();
    expect(await accessMap()).toEqual(before);
    expect(await itemShares(NOTE, ItemTypes.NOTE)).toMatchObject({
      inherited: false,
      sharedParent: FOLDER,
    });
  });

  it("keeps the item's own list when the folder changes afterwards", async () => {
    writeNote();
    shareFolder({ bob: READ });
    await detachItem(Modes.NOTES, NOTE);

    shareFolder({ bob: FULL, carol: FULL });

    const access = await accessMap();
    expect(access.bob).toEqual([true, false, false]);
    expect(access.carol).toEqual([false, false, false]);
  });

  it("refuses to detach when a folder grant can delete without editing", async () => {
    writeNote();
    shareFolder({ bob: DELETE_ONLY });
    const file = readFileSync(notePath(), "utf-8");

    const result = await detachItem(Modes.NOTES, NOTE);

    expect(result).toMatchObject({ success: false, error: DETACH_LOSSY });
    expect(readFileSync(notePath(), "utf-8")).toBe(file);
  });

  it.each([
    ["sharing it with somebody new", () => shareItem(Modes.NOTES, NOTE, "carol", READ)],
    ["unsharing one person", () => unshareItem(Modes.NOTES, NOTE, "carol")],
  ])("refuses %s when a folder grant can delete without editing", async (_, act) => {
    writeNote();
    shareFolder({ bob: DELETE_ONLY, carol: READ });
    const file = readFileSync(notePath(), "utf-8");

    expect(await act()).toMatchObject({ success: false, error: DETACH_LOSSY });
    expect(readFileSync(notePath(), "utf-8")).toBe(file);
    expect((await accessMap()).bob).toEqual([true, false, true]);
  });

  it("won't let a recipient leaving raise somebody else's access", async () => {
    writeNote();
    shareFolder({ bob: DELETE_ONLY, carol: READ });
    const file = readFileSync(notePath(), "utf-8");
    actor.username = "carol";

    expect(await leaveItem(Modes.NOTES, NOTE)).toMatchObject({
      success: false,
      error: DETACH_LOSSY,
    });
    expect(readFileSync(notePath(), "utf-8")).toBe(file);
  });

  it("leaves an item with its own list untouched", async () => {
    writeNote(["sharedWith: bob:rw"]);
    shareFolder({ carol: FULL });
    const file = readFileSync(notePath(), "utf-8");

    expect((await detachItem(Modes.NOTES, NOTE)).success).toBe(true);
    expect(readFileSync(notePath(), "utf-8")).toBe(file);
  });

  it("writes nothing for an item in a folder nobody shares", async () => {
    writeNote();
    const file = readFileSync(notePath(), "utf-8");

    expect((await detachItem(Modes.NOTES, NOTE)).success).toBe(true);
    expect(readFileSync(notePath(), "utf-8")).toBe(file);
  });

  it("follows the folder again after inheritItem", async () => {
    writeNote();
    shareFolder({ bob: READ });
    await detachItem(Modes.NOTES, NOTE);
    shareFolder({ bob: FULL });

    expect((await inheritItem(Modes.NOTES, NOTE)).success).toBe(true);

    expect(sharedWithOf()).toBeUndefined();
    expect((await accessMap()).bob).toEqual([true, true, true]);
  });

  it("refuses to follow a folder nobody shares, keeping the item's own list", async () => {
    writeNote(["sharedWith: bob:rw"]);
    const file = readFileSync(notePath(), "utf-8");

    expect(await inheritItem(Modes.NOTES, NOTE)).toMatchObject({
      success: false,
      error: NO_SHARED_PARENT,
    });
    expect(readFileSync(notePath(), "utf-8")).toBe(file);
  });

  it("tells everybody who lost or gained access when the item follows again", async () => {
    writeNote(["sharedWith: bob:rw"]);
    shareFolder({ carol: READ, [PUBLIC_USER]: READ });
    vi.mocked(broadcast).mockClear();

    await inheritItem(Modes.NOTES, NOTE);

    const told = vi.mocked(broadcast).mock.calls.map(([event]) => event.username);
    expect(told.sort()).toEqual(["alice", "bob", "carol"]);
  });

  it("refuses a recipient who tries to detach the owner's item", async () => {
    writeNote();
    shareFolder({ bob: FULL });
    const file = readFileSync(notePath(), "utf-8");
    actor.username = "bob";

    expect((await detachItem(Modes.NOTES, NOTE)).success).toBe(false);
    expect(readFileSync(notePath(), "utf-8")).toBe(file);
  });
});

describe("Reading an item's share state", () => {
  it("names the shared folder whether the item follows it or not", async () => {
    writeNote();
    shareFolder({ bob: READ });

    expect(await itemShares(NOTE, ItemTypes.NOTE)).toMatchObject({
      inherited: true,
      sharedParent: FOLDER,
      users: { bob: READ },
    });

    writeNote(["sharedWith: none"]);

    expect(await itemShares(NOTE, ItemTypes.NOTE)).toMatchObject({
      inherited: false,
      sharedParent: FOLDER,
      users: {},
    });
  });

  it("has no shared folder for an item outside any share", async () => {
    writeNote(["sharedWith: bob:r"]);

    expect((await itemShares(NOTE, ItemTypes.NOTE)).sharedParent).toBeUndefined();
  });

  it("never writes while reading", async () => {
    writeNote();
    shareFolder({ bob: READ });
    const file = readFileSync(notePath(), "utf-8");

    await itemShares(NOTE, ItemTypes.NOTE);

    expect(readFileSync(notePath(), "utf-8")).toBe(file);
  });
});
