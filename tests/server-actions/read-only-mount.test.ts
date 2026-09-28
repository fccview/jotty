import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";
import path from "path";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";

const { home, root } = vi.hoisted(() => {
  const os = process.getBuiltinModule("os");
  const fs = process.getBuiltinModule("fs");
  const nodePath = process.getBuiltinModule("path");
  const previous = process.cwd();

  process.chdir(fs.mkdtempSync(nodePath.join(os.tmpdir(), "jotty-read-only-")));

  return { home: previous, root: process.cwd() };
});

const mockIsAdmin = vi.fn();

vi.unmock("fs/promises");
vi.unmock("@/app/_utils/checklist-utils");

vi.mock("@/app/_server/actions/ws/broadcast", () => ({
  broadcast: vi.fn(),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));

vi.mock("@/app/_server/actions/users", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/_server/actions/users")>()),
  canAccessAllContent: async () => false,
  isAdmin: (...args: unknown[]) => mockIsAdmin(...args),
}));

import { catUuid } from "@/app/_server/actions/share/category-info";
import { stampUuid } from "@/app/_server/actions/lib/stamp-uuid";
import { isPathUuid, pathUuid } from "@/app/_server/actions/lib/read-only";
import { failedWith } from "@/app/_server/actions/lib/read-only-message";
import { grepFindFileByUuid } from "@/app/_utils/grep-utils";
import { getNoteById, getUserNotes } from "@/app/_server/actions/note/queries";
import { buildCategoryTree } from "@/app/_utils/category-utils";
import { migrateToInlineSharing } from "@/app/_server/actions/migration/share-migration";
import { needsMigration } from "@/app/_server/actions/lib/migration-check";
import { serverDeleteFile } from "@/app/_server/actions/file";
import { dropMounts } from "@/app/_server/actions/share/mounts";
import { CATEGORY_INFO_FILE, LEGACY_ORDER_FILE } from "@/app/_consts/sharing";
import { DATA_DIR, SCHEMA_VERSION_FILE } from "@/app/_consts/files";
import { Modes } from "@/app/_types/enums";

const USER_DIR = path.join(root, DATA_DIR, Modes.NOTES, "alice");
const MOUNT_DIR = path.join(USER_DIR, "git", "joplin");
const NOTE_PATH = path.join(MOUNT_DIR, "old-note.md");
const NOTE_BODY = "# Old note\n\nFrom the archive\n";
const IS_ROOT = process.getuid?.() === 0;

const lock = () => chmodSync(MOUNT_DIR, 0o555);
const unlock = () => {
  if (existsSync(MOUNT_DIR)) chmodSync(MOUNT_DIR, 0o755);
};

const leftovers = () =>
  readdirSync(MOUNT_DIR).filter((name) => name !== "old-note.md");

afterAll(() => {
  unlock();
  process.chdir(home);
  rmSync(root, { recursive: true, force: true });
});

beforeEach(() => {
  unlock();
  rmSync(path.join(root, DATA_DIR), { recursive: true, force: true });
  dropMounts(Modes.NOTES);
  mockIsAdmin.mockResolvedValue(true);
  mkdirSync(MOUNT_DIR, { recursive: true });
  writeFileSync(NOTE_PATH, NOTE_BODY);
  lock();
});

afterEach(() => {
  unlock();
  vi.restoreAllMocks();
});

describe.skipIf(IS_ROOT)("Read-only mounted category (#580)", () => {
  it("derives a stable category uuid without writing category info", async () => {
    const first = await catUuid(MOUNT_DIR);
    const second = await catUuid(MOUNT_DIR);

    expect(first).toBe(pathUuid(MOUNT_DIR));
    expect(second).toBe(first);
    expect(isPathUuid(first)).toBe(true);
    expect(existsSync(path.join(MOUNT_DIR, CATEGORY_INFO_FILE))).toBe(false);
    expect(leftovers()).toEqual([]);
  });

  it("derives an item uuid from the path and leaves the file untouched", async () => {
    const uuid = await stampUuid(NOTE_PATH);

    expect(uuid).toBe(pathUuid(NOTE_PATH));
    expect(readFileSync(NOTE_PATH, "utf-8")).toBe(NOTE_BODY);
    expect(leftovers()).toEqual([]);
  });

  it("finds an unstamped item by its derived uuid", async () => {
    const found = await grepFindFileByUuid(USER_DIR, pathUuid(NOTE_PATH));

    expect(found).toEqual({
      filePath: NOTE_PATH,
      id: "old-note",
      category: "git/joplin",
    });
  });

  it("finds an unstamped item whose body has a uuid line", async () => {
    unlock();
    writeFileSync(NOTE_PATH, "# Old note\n\nuuid: example\n");
    lock();

    const found = await grepFindFileByUuid(USER_DIR, pathUuid(NOTE_PATH));

    expect(found?.filePath).toBe(NOTE_PATH);
  });

  it("does not match a derived uuid when the frontmatter stores one", async () => {
    unlock();
    writeFileSync(
      NOTE_PATH,
      "---\nuuid: 22222222-2222-4222-8222-222222222222\n---\n# Old note\n",
    );
    lock();

    const found = await grepFindFileByUuid(USER_DIR, pathUuid(NOTE_PATH));

    expect(found).toBeNull();
  });

  it("does not scan for derived uuids when the uuid is a random one", async () => {
    const found = await grepFindFileByUuid(
      USER_DIR,
      "11111111-1111-4111-8111-111111111111",
    );

    expect(found).toBeNull();
  });

  it("lists and opens read-only notes with the same uuid every time", async () => {
    const listed = await getUserNotes({ username: "alice", metadataOnly: true });
    const full = await getUserNotes({ username: "alice" });
    const expected = pathUuid(NOTE_PATH);

    expect(listed.data?.map((note) => note.uuid)).toEqual([expected]);
    expect(full.data?.map((note) => note.uuid)).toEqual([expected]);

    const opened = await getNoteById(expected, "alice");
    expect(opened?.uuid).toBe(expected);
    expect(opened?.content).toContain("From the archive");
    expect(readFileSync(NOTE_PATH, "utf-8")).toBe(NOTE_BODY);
  });

  it("builds the category tree over a read-only folder", async () => {
    const tree = await buildCategoryTree(USER_DIR);
    const mount = tree.find((category) => category.path === "git/joplin");

    expect(mount?.uuid).toBe(pathUuid(MOUNT_DIR));
    expect(mount?.count).toBe(1);
  });

  it("migrates around a read-only folder with one warning and does not loop", async () => {
    unlock();
    writeFileSync(
      path.join(MOUNT_DIR, LEGACY_ORDER_FILE),
      JSON.stringify({ items: ["old-note"] }),
    );
    lock();

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await migrateToInlineSharing();

    expect(result.success).toBe(true);
    expect(await needsMigration()).toBe(false);
    expect(existsSync(path.join(root, SCHEMA_VERSION_FILE))).toBe(true);
    expect(existsSync(path.join(MOUNT_DIR, LEGACY_ORDER_FILE))).toBe(true);
    expect(readFileSync(NOTE_PATH, "utf-8")).toBe(NOTE_BODY);

    const mountWarnings = warn.mock.calls.filter((call) =>
      String(call[0]).includes(MOUNT_DIR),
    );
    expect(mountWarnings.length).toBeLessThanOrEqual(1);
  });

  it("refuses to pretend a delete in a read-only folder worked", async () => {
    let caught: unknown;

    try {
      await serverDeleteFile(NOTE_PATH);
    } catch (error) {
      caught = error;
    }

    expect(existsSync(NOTE_PATH)).toBe(true);
    expect(await failedWith(caught, "Failed to delete note")).toBe(
      "readOnlyFolder",
    );
  });

  it("keeps the generic message for other failures", async () => {
    expect(await failedWith(new Error("boom"), "Failed to delete note")).toBe(
      "Failed to delete note",
    );
  });
});
