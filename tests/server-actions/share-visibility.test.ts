import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import path from "path";
import { mkdirSync, rmSync, writeFileSync } from "fs";

const { home, root } = vi.hoisted(() => {
  const os = process.getBuiltinModule("os");
  const fs = process.getBuiltinModule("fs");
  const nodePath = process.getBuiltinModule("path");
  const previous = process.cwd();

  process.chdir(fs.mkdtempSync(nodePath.join(os.tmpdir(), "jotty-share-visibility-")));

  return { home: previous, root: process.cwd() };
});

vi.unmock("fs/promises");
vi.unmock("@/app/_utils/checklist-utils");

vi.mock("@/app/_server/actions/ws/broadcast", () => ({
  broadcast: vi.fn(),
}));

vi.mock("@/app/_server/actions/users", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/_server/actions/users")>()),
  canAccessAllContent: async () => false,
}));

import { getCategories } from "@/app/_server/actions/category/queries";
import { getUserChecklists } from "@/app/_server/actions/checklist/queries";
import { getUserNotes } from "@/app/_server/actions/note/queries";
import { dropMounts, mountsFor } from "@/app/_server/actions/share/mounts";
import { canReach } from "@/app/_server/actions/share/queries";
import {
  ItemTypes,
  Modes,
  PermissionTypes,
} from "@/app/_types/enums";
import { DATA_DIR } from "@/app/_consts/files";
import { CATEGORY_INFO_FILE } from "@/app/_consts/sharing";

const READ_ONLY = { canRead: true, canEdit: false, canDelete: false };
const FULL = { canRead: true, canEdit: true, canDelete: true };

const LIST_FULL = "11111111-1111-4111-8111-111111111111";
const LIST_READ = "22222222-2222-4222-8222-222222222222";
const NOTE_FULL = "33333333-3333-4333-8333-333333333333";
const NOTE_READ = "44444444-4444-4444-8444-444444444444";
const NOTE_LISTED = "55555555-5555-4555-8555-555555555555";

const modeDir = (mode: Modes, owner: string, category = ""): string =>
  path.join(root, DATA_DIR, mode, owner, category);

const writeItem = (
  mode: Modes,
  owner: string,
  category: string,
  name: string,
  frontmatter: string[],
  body = "- [ ] milk",
) => {
  const dir = modeDir(mode, owner, category);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, `${name}.md`),
    ["---", ...frontmatter, "---", body, ""].join("\n"),
  );
};

const writeFolder = (
  mode: Modes,
  owner: string,
  category: string,
  info: Record<string, unknown>,
) => {
  const dir = modeDir(mode, owner, category);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, CATEGORY_INFO_FILE), JSON.stringify(info));
};

const permsOf = (items: { uuid?: string; permissions?: unknown }[]) =>
  Object.fromEntries(items.map((item) => [item.uuid, item.permissions]));

afterAll(() => {
  process.chdir(home);
  rmSync(root, { recursive: true, force: true });
});

beforeEach(() => {
  rmSync(path.join(root, DATA_DIR), { recursive: true, force: true });
  dropMounts(Modes.NOTES);
  dropMounts(Modes.CHECKLISTS);
});

describe("Share visibility on disk", () => {
  it("shows a folder share to a recipient with no content of their own (#582)", async () => {
    writeItem(Modes.CHECKLISTS, "alice", "Groceries", "weekly", [
      `uuid: ${LIST_FULL}`,
      "title: Weekly",
    ]);
    writeFolder(Modes.CHECKLISTS, "alice", "Groceries", {
      uuid: "groceries-uuid",
      sharing: { users: { bob: READ_ONLY }, inherit: true },
    });

    const categories = await getCategories(Modes.CHECKLISTS, "bob");
    const lists = await getUserChecklists({
      username: "bob",
      metadataOnly: true,
      preserveOrder: true,
    });

    expect(categories.data).toEqual([
      expect.objectContaining({
        name: "Groceries",
        sharedFrom: "alice",
        permissions: READ_ONLY,
      }),
    ]);
    expect(lists.data?.map((list) => list.uuid)).toEqual([LIST_FULL]);
  });

  it("gives each loose share its own permissions instead of the first one found (#604)", async () => {
    writeItem(Modes.CHECKLISTS, "alice", "Misc", "full-access", [
      `uuid: ${LIST_FULL}`,
      "title: Full Access",
      "sharedWith: bob:rwd",
    ]);
    writeItem(Modes.CHECKLISTS, "alice", "Misc", "read-only", [
      `uuid: ${LIST_READ}`,
      "title: Read Only",
      "sharedWith: bob:r",
    ]);

    const lists = await getUserChecklists({
      username: "bob",
      metadataOnly: true,
      preserveOrder: true,
    });
    const categories = await getCategories(Modes.CHECKLISTS, "bob");

    expect(permsOf(lists.data || [])).toEqual({
      [LIST_FULL]: FULL,
      [LIST_READ]: READ_ONLY,
    });
    expect(categories.data?.[0]).toEqual(
      expect.objectContaining({ isLoose: true, permissions: READ_ONLY }),
    );
  });

  it("lets an item grant narrow a folder grant in the sidebar data (#604)", async () => {
    writeFolder(Modes.NOTES, "alice", "Test", {
      uuid: "test-uuid",
      sharing: { users: { bob: FULL }, inherit: true },
    });
    writeItem(
      Modes.NOTES,
      "alice",
      "Test",
      "full-access",
      [`uuid: ${NOTE_FULL}`, "title: Full Access"],
      "hello",
    );
    writeItem(
      Modes.NOTES,
      "alice",
      "Test",
      "read-only",
      [`uuid: ${NOTE_READ}`, "title: Read Only", "sharedWith: bob:r"],
      "hello",
    );
    writeItem(
      Modes.NOTES,
      "alice",
      "Test",
      "yaml-list",
      [`uuid: ${NOTE_LISTED}`, "title: Listed", "sharedWith:", "  - bob:rw"],
      "hello",
    );

    const notes = await getUserNotes({
      username: "bob",
      metadataOnly: true,
      preserveOrder: true,
    });

    expect(permsOf(notes.data || [])).toEqual({
      [NOTE_FULL]: FULL,
      [NOTE_READ]: READ_ONLY,
      [NOTE_LISTED]: { canRead: true, canEdit: true, canDelete: false },
    });
    expect(
      await canReach(NOTE_READ, ItemTypes.NOTE, "bob", PermissionTypes.DELETE),
    ).toBe(false);
  });

  it("hides an item from a folder share once the item opts out (#604)", async () => {
    writeFolder(Modes.NOTES, "alice", "Test", {
      uuid: "test-uuid",
      sharing: { users: { bob: FULL }, inherit: true },
    });
    writeItem(
      Modes.NOTES,
      "alice",
      "Test",
      "private",
      [`uuid: ${NOTE_FULL}`, "title: Private", "sharedWith: none"],
      "hello",
    );

    const notes = await getUserNotes({
      username: "bob",
      metadataOnly: true,
      preserveOrder: true,
    });

    expect(notes.data).toEqual([]);
  });

  it("does not mistake another user's folder for the viewer's own when names share a prefix", async () => {
    writeFolder(Modes.CHECKLISTS, "bobby", "Garage", {
      uuid: "garage-uuid",
      sharing: { users: { bob: READ_ONLY }, inherit: true },
    });
    writeItem(Modes.CHECKLISTS, "bobby", "Garage", "tools", [
      `uuid: ${LIST_READ}`,
      "title: Tools",
    ]);

    const mounts = await mountsFor(Modes.CHECKLISTS, "bob");

    expect(mounts).toEqual([
      expect.objectContaining({ owner: "bobby", categoryUuid: "garage-uuid" }),
    ]);
  });
});
