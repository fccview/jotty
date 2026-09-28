import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import path from "path";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";

const { home, root } = vi.hoisted(() => {
  const os = process.getBuiltinModule("os");
  const fs = process.getBuiltinModule("fs");
  const nodePath = process.getBuiltinModule("path");
  const previous = process.cwd();

  process.chdir(fs.mkdtempSync(nodePath.join(os.tmpdir(), "jotty-user-deletion-")));

  return { home: previous, root: process.cwd() };
});

vi.unmock("fs/promises");

const mockBroadcast = vi.fn();

vi.mock("@/app/_server/actions/ws/broadcast", () => ({
  broadcast: (...args: unknown[]) => mockBroadcast(...args),
}));

vi.mock("@/app/_server/actions/relations/tracking", () => ({
  trackItemWrite: vi.fn(),
  trackItemDelete: vi.fn(),
  trackTreeDelete: vi.fn(),
  trackMove: vi.fn(),
}));

vi.mock("@/app/_server/actions/users", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/_server/actions/users")>()),
  canAccessAllContent: async () => false,
}));

import { _deleteUserCore } from "@/app/_server/actions/users/core";
import { revokeGrants } from "@/app/_server/actions/share/rename";
import { dropMounts, mountsFor } from "@/app/_server/actions/share/mounts";
import { canReach } from "@/app/_server/actions/share/queries";
import { ItemTypes, Modes, PermissionTypes } from "@/app/_types/enums";
import { DATA_DIR, USERS_FILE } from "@/app/_consts/files";
import { CATEGORY_INFO_FILE } from "@/app/_consts/sharing";
import { extractYamlMetadata } from "@/app/_utils/yaml-metadata-utils";

const READ_ONLY = { canRead: true, canEdit: false, canDelete: false };
const WRITABLE = { canRead: true, canEdit: true, canDelete: false };

const PLAN = "11111111-1111-4111-8111-111111111111";
const SOLO = "22222222-2222-4222-8222-222222222222";
const BOB_NOTE = "33333333-3333-4333-8333-333333333333";

const dirOf = (mode: Modes, owner: string, category = ""): string =>
  path.join(root, DATA_DIR, mode, owner, category);

const fileOf = (mode: Modes, owner: string, category: string, name: string) =>
  path.join(dirOf(mode, owner, category), `${name}.md`);

const writeItem = (
  mode: Modes,
  owner: string,
  category: string,
  name: string,
  frontmatter: string[],
  body: string,
) => {
  mkdirSync(dirOf(mode, owner, category), { recursive: true });
  writeFileSync(
    fileOf(mode, owner, category, name),
    ["---", ...frontmatter, "---", body, ""].join("\n"),
  );
};

const writeFolder = (
  mode: Modes,
  owner: string,
  category: string,
  info: Record<string, unknown>,
) => {
  mkdirSync(dirOf(mode, owner, category), { recursive: true });
  writeFileSync(
    path.join(dirOf(mode, owner, category), CATEGORY_INFO_FILE),
    JSON.stringify(info),
  );
};

const folderInfo = (mode: Modes, owner: string, category: string) =>
  JSON.parse(
    readFileSync(
      path.join(dirOf(mode, owner, category), CATEGORY_INFO_FILE),
      "utf-8",
    ),
  );

const frontmatterOf = (filePath: string) =>
  extractYamlMetadata(readFileSync(filePath, "utf-8"));

const seedUsers = (users: Record<string, unknown>[]) => {
  mkdirSync(path.dirname(path.join(root, USERS_FILE)), { recursive: true });
  writeFileSync(path.join(root, USERS_FILE), JSON.stringify(users));
};

const seedShares = () => {
  writeItem(
    Modes.NOTES,
    "alice",
    "Work",
    "plan",
    [`uuid: ${PLAN}`, "title: Plan", "sharedWith: bob:rw, carol:r"],
    "The plan body stays exactly as it was.",
  );
  writeItem(
    Modes.NOTES,
    "alice",
    "Work",
    "solo",
    [`uuid: ${SOLO}`, "title: Solo", "sharedWith: bob:rwd"],
    "Only bob had this one.",
  );
  writeFolder(Modes.CHECKLISTS, "alice", "Groceries", {
    uuid: "groceries-uuid",
    sharing: { users: { bob: WRITABLE, carol: READ_ONLY }, inherit: true },
    order: { items: ["keep-me"] },
  });
  writeItem(
    Modes.NOTES,
    "bob",
    "Mine",
    "bobs",
    [`uuid: ${BOB_NOTE}`, "title: Bobs", "sharedWith: carol:rw"],
    "Bob's own note.",
  );
  writeFolder(Modes.NOTES, "bob", "Mine", {
    uuid: "bob-folder-uuid",
    sharing: { users: { carol: WRITABLE }, inherit: true },
  });
};

afterAll(() => {
  process.chdir(home);
  rmSync(root, { recursive: true, force: true });
});

beforeEach(() => {
  mockBroadcast.mockReset();
  rmSync(path.join(root, DATA_DIR), { recursive: true, force: true });
  dropMounts(Modes.NOTES);
  dropMounts(Modes.CHECKLISTS);
});

describe("revokeGrants", () => {
  it("drops only the revoked user from item and folder grants", async () => {
    seedShares();

    const touched = await revokeGrants("bob");

    const plan = frontmatterOf(fileOf(Modes.NOTES, "alice", "Work", "plan"));
    expect(plan.metadata.sharedWith).toBe("carol:r");
    expect(plan.metadata.uuid).toBe(PLAN);
    expect(plan.contentWithoutMetadata).toBe(
      "The plan body stays exactly as it was.",
    );

    const groceries = folderInfo(Modes.CHECKLISTS, "alice", "Groceries");
    expect(groceries.sharing.users).toEqual({ carol: READ_ONLY });
    expect(groceries.sharing.inherit).toBe(true);
    expect(groceries.uuid).toBe("groceries-uuid");
    expect(groceries.order).toEqual({ items: ["keep-me"] });

    expect(touched).toBe(3);
    expect(mockBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "sharing", username: "bob" }),
    );
  });

  it("keeps an item private instead of falling back to the folder grant", async () => {
    seedShares();
    writeFolder(Modes.NOTES, "alice", "Work", {
      uuid: "work-uuid",
      sharing: { users: { carol: WRITABLE }, inherit: true },
    });

    await revokeGrants("bob");

    const solo = frontmatterOf(fileOf(Modes.NOTES, "alice", "Work", "solo"));
    expect(solo.metadata.sharedWith).toBe("none");
    expect(
      await canReach(SOLO, ItemTypes.NOTE, "carol", PermissionTypes.READ),
    ).toBe(false);
  });

  it("leaves files that never mentioned the user alone", async () => {
    seedShares();
    const before = readFileSync(
      fileOf(Modes.NOTES, "bob", "Mine", "bobs"),
      "utf-8",
    );

    await revokeGrants("dave");

    expect(
      readFileSync(fileOf(Modes.NOTES, "bob", "Mine", "bobs"), "utf-8"),
    ).toBe(before);
    expect(
      folderInfo(Modes.CHECKLISTS, "alice", "Groceries").sharing.users,
    ).toEqual({ bob: WRITABLE, carol: READ_ONLY });
  });
});

describe("_deleteUserCore", () => {
  it("removes the deleted user from every share and every mount (#600)", async () => {
    seedShares();
    seedUsers([
      { username: "alice", passwordHash: "x", isAdmin: true, isSuperAdmin: true },
      { username: "bob", passwordHash: "x", isAdmin: false },
      { username: "carol", passwordHash: "x", isAdmin: false },
    ]);

    expect(await mountsFor(Modes.NOTES, "carol")).toHaveLength(2);

    const result = await _deleteUserCore("bob");

    expect(result.success).toBe(true);
    expect(existsSync(dirOf(Modes.NOTES, "bob"))).toBe(false);

    const users = JSON.parse(readFileSync(path.join(root, USERS_FILE), "utf-8"));
    expect(users.map((user: { username: string }) => user.username)).toEqual([
      "alice",
      "carol",
    ]);

    expect(
      frontmatterOf(fileOf(Modes.NOTES, "alice", "Work", "plan")).metadata
        .sharedWith,
    ).toBe("carol:r");
    expect(
      folderInfo(Modes.CHECKLISTS, "alice", "Groceries").sharing.users,
    ).toEqual({ carol: READ_ONLY });

    const carolNotes = await mountsFor(Modes.NOTES, "carol");
    expect(carolNotes.map((mount) => mount.owner)).toEqual(["alice"]);
    expect(await mountsFor(Modes.CHECKLISTS, "bob")).toEqual([]);
  });

  it("refuses to delete the super admin and leaves shares untouched", async () => {
    seedShares();
    seedUsers([
      { username: "alice", passwordHash: "x", isAdmin: true, isSuperAdmin: true },
      { username: "bob", passwordHash: "x", isAdmin: true },
    ]);

    const result = await _deleteUserCore("alice");

    expect(result.success).toBe(false);
    expect(
      frontmatterOf(fileOf(Modes.NOTES, "alice", "Work", "plan")).metadata
        .sharedWith,
    ).toBe("bob:rw, carol:r");
  });
});
