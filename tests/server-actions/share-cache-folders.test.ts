import { describe, it, expect, vi, afterAll } from "vitest";
import path from "path";
import { mkdirSync, rmSync, writeFileSync } from "fs";

const { home, root } = vi.hoisted(() => {
  const os = process.getBuiltinModule("os");
  const fs = process.getBuiltinModule("fs");
  const nodePath = process.getBuiltinModule("path");
  const previous = process.cwd();

  process.chdir(fs.mkdtempSync(nodePath.join(os.tmpdir(), "jotty-share-folders-")));

  return { home: previous, root: process.cwd() };
});

const { actor } = vi.hoisted(() => ({ actor: { username: "" } }));

vi.unmock("fs/promises");

vi.mock("@/app/_server/actions/ws/broadcast", () => ({ broadcast: vi.fn() }));
vi.mock("@/app/_server/actions/log", () => ({ logAudit: vi.fn() }));
vi.mock("@/app/_server/actions/notifications/internal", () => ({ notifyUser: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("@/app/_server/actions/users/records", () => ({
  findUserRecord: async (username: string) => ({ username }),
}));
vi.mock("@/app/_server/actions/users", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/_server/actions/users")>()),
  getCurrentUser: async () => ({ username: actor.username, isAdmin: false }),
  getUsername: async () => actor.username,
  canAccessAllContent: async () => false,
}));

import * as grep from "@/app/_utils/grep-utils";
import { allShared, sharedForUser } from "@/app/_server/actions/share/queries";
import { mountsFor } from "@/app/_server/actions/share/mounts";
import { shareFolder, unshareFolder } from "@/app/_server/actions/share/operations";
import {
  catUuid,
  mutateCatInfo,
  writeCatOrder,
} from "@/app/_server/actions/share/category-info";
import {
  serverDeleteDir,
  serverDeleteFile,
  serverRenamePath,
} from "@/app/_server/actions/file";
import { invalidatePath } from "@/app/_server/actions/lib/metadata-cache";
import { DATA_DIR } from "@/app/_consts/files";
import { CATEGORY_INFO_FILE, PUBLIC_USER } from "@/app/_consts/sharing";
import { Modes } from "@/app/_types/enums";
import { SharingPermissions } from "@/app/_types/core";
import { CategoryInfo } from "@/app/_types/sharing";

const READ: SharingPermissions = { canRead: true, canEdit: false, canDelete: false };
const EDIT: SharingPermissions = { canRead: true, canEdit: true, canDelete: false };

const notesDir = path.join(root, DATA_DIR, Modes.NOTES);
const dirOf = (owner: string, category = "") => path.join(notesDir, owner, category);

let worlds = 0;
let uuids = 0;

const nextUuid = () => {
  uuids += 1;
  return `00000000-0000-4000-8000-${String(uuids).padStart(12, "0")}`;
};

const world = () => {
  worlds += 1;
  const owner = `alice${worlds}`;
  const viewer = `bob${worlds}`;
  mkdirSync(dirOf(viewer), { recursive: true });
  return { owner, viewer };
};

const writeNote = (owner: string, category: string, name: string, uuid: string, extra = "") => {
  const filePath = path.join(dirOf(owner, category), `${name}.md`);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `---\nuuid: ${uuid}\ntitle: ${name}\n${extra}---\n\nbody`);
  invalidatePath(filePath);
  return filePath;
};

const setFolder = async (
  owner: string,
  category: string,
  reshape: (info: CategoryInfo) => CategoryInfo,
) => {
  const dir = dirOf(owner, category);
  mkdirSync(dir, { recursive: true });
  await mutateCatInfo(dir, reshape);
  invalidatePath(path.join(dir, CATEGORY_INFO_FILE));
};

const shareWith = (users: Record<string, SharingPermissions>, inherit = true) => (info: CategoryInfo) => ({
  ...info,
  uuid: info.uuid || nextUuid(),
  sharing: { users, inherit },
});

const createFolder = async (owner: string, category: string) => {
  const dir = dirOf(owner, category);
  mkdirSync(dir, { recursive: true });
  await catUuid(dir);
  invalidatePath(path.join(dir, CATEGORY_INFO_FILE));
};

const reorder = async (owner: string, category: string, items: string[]) => {
  const dir = dirOf(owner, category);
  await writeCatOrder(dir, { items });
  invalidatePath(path.join(dir, CATEGORY_INFO_FILE));
};

const mountsOf = async (viewer: string) =>
  (await mountsFor(Modes.NOTES, viewer))
    .map(({ owner, categoryPath, isImplicit, permissions, itemUuids }) => ({
      owner,
      categoryPath,
      isImplicit,
      permissions,
      itemUuids: itemUuids ? [...itemUuids].sort() : undefined,
    }))
    .sort((a, b) => a.categoryPath.localeCompare(b.categoryPath));

const sharedWith = async (viewer: string) =>
  (await sharedForUser(viewer)).notes.map((entry) => entry.uuid).sort();

const publicNotes = async () => (await allShared()).public.notes.map((entry) => entry.uuid).sort();

const warm = async (viewer: string) => {
  await mountsOf(viewer);
  await sharedWith(viewer);
  await publicNotes();
};

const folderMount = (owner: string, categoryPath: string, permissions = READ) => ({
  owner,
  categoryPath,
  isImplicit: false,
  permissions,
  itemUuids: undefined,
});

const looseMount = (owner: string, itemUuids: string[]) => ({
  owner,
  categoryPath: owner,
  isImplicit: true,
  permissions: expect.objectContaining(READ),
  itemUuids: [...itemUuids].sort(),
});

const settle = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

const until = async (done: () => Promise<boolean>, ms = 3000) => {
  const deadline = Date.now() + ms;
  while (!(await done()) && Date.now() < deadline) await settle(25);
};

const sorted = (...values: string[]) => [...values].sort();

afterAll(() => {
  process.chdir(home);
  rmSync(root, { recursive: true, force: true });
});

describe("share caches when folders change", () => {
  it("shows an item once it is shared and hides it once unshared", async () => {
    const { owner, viewer } = world();
    const plan = nextUuid();
    writeNote(owner, "Work", "plan", plan);
    await warm(viewer);

    writeNote(owner, "Work", "plan", plan, `sharedWith: ${viewer}:r\n`);
    expect(await mountsOf(viewer)).toEqual([looseMount(owner, [plan])]);
    expect(await sharedWith(viewer)).toEqual([plan]);

    writeNote(owner, "Work", "plan", plan);
    expect(await mountsOf(viewer)).toEqual([]);
    expect(await sharedWith(viewer)).toEqual([]);
  });

  it("mounts a folder once it is shared and drops it once unshared", async () => {
    const { owner, viewer } = world();
    const plan = nextUuid();
    const notes = nextUuid();
    writeNote(owner, "Work", "plan", plan);
    writeNote(owner, "Work/Deep", "notes", notes);
    await createFolder(owner, "Work");
    await warm(viewer);

    await setFolder(owner, "Work", shareWith({ [viewer]: READ }));
    expect(await mountsOf(viewer)).toEqual([folderMount(owner, "Work")]);
    expect(await sharedWith(viewer)).toEqual(sorted(plan, notes));

    await setFolder(owner, "Work", shareWith({}));
    expect(await mountsOf(viewer)).toEqual([]);
    expect(await sharedWith(viewer)).toEqual([]);
  });

  it("follows a permission change on a shared folder", async () => {
    const { owner, viewer } = world();
    writeNote(owner, "Work", "plan", nextUuid());
    await setFolder(owner, "Work", shareWith({ [viewer]: READ }));
    await warm(viewer);

    await setFolder(owner, "Work", shareWith({ [viewer]: EDIT }));
    expect(await mountsOf(viewer)).toEqual([folderMount(owner, "Work", EDIT)]);
  });

  it("goes through the share actions themselves", async () => {
    const { owner, viewer } = world();
    const plan = nextUuid();
    writeNote(owner, "Work", "plan", plan);
    await createFolder(owner, "Work");
    await warm(viewer);

    actor.username = owner;
    const folderUuid = await catUuid(dirOf(owner, "Work"));

    expect((await shareFolder(Modes.NOTES, owner, folderUuid, viewer, READ)).success).toBe(true);
    expect(await mountsOf(viewer)).toEqual([folderMount(owner, "Work")]);
    expect(await sharedWith(viewer)).toEqual([plan]);

    expect((await unshareFolder(Modes.NOTES, owner, folderUuid, viewer)).success).toBe(true);
    expect(await mountsOf(viewer)).toEqual([]);
    expect(await sharedWith(viewer)).toEqual([]);
  });

  it("surfaces a nested shared folder once its shared parent is unshared", async () => {
    const { owner, viewer } = world();
    const plan = nextUuid();
    const memo = nextUuid();
    writeNote(owner, "Work", "plan", plan);
    writeNote(owner, "Work/Team", "memo", memo);
    await setFolder(owner, "Work", shareWith({ [viewer]: READ }));
    await setFolder(owner, "Work/Team", shareWith({ [viewer]: READ }));
    await warm(viewer);
    expect(await mountsOf(viewer)).toEqual([folderMount(owner, "Work")]);

    await setFolder(owner, "Work", shareWith({}));
    expect(await mountsOf(viewer)).toEqual([folderMount(owner, "Work/Team")]);
    expect(await sharedWith(viewer)).toEqual([memo]);
  });

  it("stops and resumes inheriting a parent share when a subfolder flips inherit", async () => {
    const { owner, viewer } = world();
    const plan = nextUuid();
    const diary = nextUuid();
    writeNote(owner, "Work", "plan", plan);
    writeNote(owner, "Work/Private", "diary", diary);
    await setFolder(owner, "Work", shareWith({ [viewer]: READ }));
    await createFolder(owner, "Work/Private");
    await warm(viewer);
    expect(await sharedWith(viewer)).toEqual(sorted(plan, diary));

    await setFolder(owner, "Work/Private", shareWith({}, false));
    expect(await sharedWith(viewer)).toEqual([plan]);

    await setFolder(owner, "Work/Private", shareWith({}, true));
    expect(await sharedWith(viewer)).toEqual(sorted(plan, diary));
  });

  it("follows a shared folder that gets renamed", async () => {
    const { owner, viewer } = world();
    const plan = nextUuid();
    writeNote(owner, "Work", "plan", plan);
    await setFolder(owner, "Work", shareWith({ [viewer]: READ }));
    await warm(viewer);

    await serverRenamePath(dirOf(owner, "Work"), dirOf(owner, "Projects"));
    expect(await mountsOf(viewer)).toEqual([folderMount(owner, "Projects")]);
    expect(await sharedWith(viewer)).toEqual([plan]);
  });

  it("follows a shared folder that gets moved into another folder", async () => {
    const { owner, viewer } = world();
    const plan = nextUuid();
    writeNote(owner, "Work", "plan", plan);
    await setFolder(owner, "Work", shareWith({ [viewer]: READ }));
    await createFolder(owner, "Archive");
    await warm(viewer);

    await serverRenamePath(dirOf(owner, "Work"), dirOf(owner, "Archive/Work"));
    expect(await mountsOf(viewer)).toEqual([folderMount(owner, "Archive/Work")]);
    expect(await sharedWith(viewer)).toEqual([plan]);
  });

  it("forgets a shared folder that gets deleted", async () => {
    const { owner, viewer } = world();
    writeNote(owner, "Work", "plan", nextUuid());
    await setFolder(owner, "Work", shareWith({ [viewer]: READ }));
    await warm(viewer);

    await serverDeleteDir(dirOf(owner, "Work"));
    expect(await mountsOf(viewer)).toEqual([]);
    expect(await sharedWith(viewer)).toEqual([]);
  });

  it("shares an item moved into a shared folder and stops once it moves out", async () => {
    const { owner, viewer } = world();
    const plan = nextUuid();
    const stray = nextUuid();
    writeNote(owner, "Work", "plan", plan);
    writeNote(owner, "Loose", "stray", stray);
    await setFolder(owner, "Work", shareWith({ [viewer]: READ }));
    await warm(viewer);
    expect(await sharedWith(viewer)).toEqual([plan]);

    await serverRenamePath(path.join(dirOf(owner, "Loose"), "stray.md"), path.join(dirOf(owner, "Work"), "stray.md"));
    await reorder(owner, "Loose", []);
    await reorder(owner, "Work", [plan, stray]);
    expect(await sharedWith(viewer)).toEqual(sorted(plan, stray));
    expect(await mountsOf(viewer)).toEqual([folderMount(owner, "Work")]);

    await serverRenamePath(path.join(dirOf(owner, "Work"), "stray.md"), path.join(dirOf(owner, "Loose"), "stray.md"));
    await reorder(owner, "Work", [plan]);
    await reorder(owner, "Loose", [stray]);
    expect(await sharedWith(viewer)).toEqual([plan]);
    expect(await mountsOf(viewer)).toEqual([folderMount(owner, "Work")]);
  });

  it("shares what lands in a folder created inside a shared folder", async () => {
    const { owner, viewer } = world();
    const plan = nextUuid();
    const later = nextUuid();
    writeNote(owner, "Work", "plan", plan);
    await setFolder(owner, "Work", shareWith({ [viewer]: READ }));
    await warm(viewer);

    await createFolder(owner, "Work/Sub");
    expect(await mountsOf(viewer)).toEqual([folderMount(owner, "Work")]);
    expect(await sharedWith(viewer)).toEqual([plan]);

    writeNote(owner, "Work/Sub", "later", later);
    expect(await sharedWith(viewer)).toEqual(sorted(plan, later));
  });

  it("forgets a shared item once it is deleted", async () => {
    const { owner, viewer } = world();
    const plan = nextUuid();
    const kept = nextUuid();
    const loose = writeNote(owner, "Misc", "plan", plan, `sharedWith: ${viewer}:r\n`);
    writeNote(owner, "Misc", "kept", kept, `sharedWith: ${viewer}:r\n`);
    await warm(viewer);
    expect(await mountsOf(viewer)).toEqual([looseMount(owner, [plan, kept])]);

    await serverDeleteFile(loose);
    expect(await mountsOf(viewer)).toEqual([looseMount(owner, [kept])]);
    expect(await sharedWith(viewer)).toEqual([kept]);
  });

  it("tracks a folder made public and private again", async () => {
    const { owner, viewer } = world();
    const plan = nextUuid();
    writeNote(owner, "Open", "plan", plan);
    await createFolder(owner, "Open");
    await warm(viewer);
    expect(await publicNotes()).not.toContain(plan);

    await setFolder(owner, "Open", shareWith({ [PUBLIC_USER]: READ }));
    expect(await publicNotes()).toContain(plan);
    expect(await mountsOf(viewer)).toEqual([]);

    await setFolder(owner, "Open", shareWith({}));
    expect(await publicNotes()).not.toContain(plan);
  });

  it("follows a share on the owner's whole library and a subfolder opting out of it", async () => {
    const { owner, viewer } = world();
    const plan = nextUuid();
    const diary = nextUuid();
    writeNote(owner, "Work", "plan", plan);
    writeNote(owner, "Private", "diary", diary);
    await createFolder(owner, "Private");
    await warm(viewer);

    await setFolder(owner, "", shareWith({ [viewer]: READ }));
    expect(await sharedWith(viewer)).toEqual(sorted(plan, diary));

    await setFolder(owner, "Private", shareWith({}, false));
    expect(await sharedWith(viewer)).toEqual([plan]);

    await setFolder(owner, "", shareWith({}));
    expect(await sharedWith(viewer)).toEqual([]);
    expect(await mountsOf(viewer)).toEqual([]);
  });

  it("notices a folder share written straight to disk through the watcher alone", async () => {
    const { owner, viewer } = world();
    const plan = nextUuid();
    writeNote(owner, "Work", "plan", plan);
    await createFolder(owner, "Work");
    await warm(viewer);

    await mutateCatInfo(dirOf(owner, "Work"), shareWith({ [viewer]: READ }));
    await until(async () => (await sharedWith(viewer)).length > 0);

    expect(await sharedWith(viewer)).toEqual([plan]);
    expect(await mountsOf(viewer)).toEqual([folderMount(owner, "Work")]);
  });

  describe("without rescanning every user's notes", () => {
    const quietly = async (viewer: string, work: () => Promise<void>) => {
      await settle();
      await warm(viewer);
      const scans = vi.spyOn(grep, "grepFilesByText");
      const walks = vi.spyOn(grep, "grepListAllFiles");
      try {
        await work();
        await settle();
        await warm(viewer);
        return scans.mock.calls.length + walks.mock.calls.length;
      } finally {
        scans.mockRestore();
        walks.mockRestore();
      }
    };

    it("keeps both caches when a folder is created away from any share", async () => {
      const { owner, viewer } = world();
      const plan = nextUuid();
      writeNote(owner, "Work", "plan", plan);
      await setFolder(owner, "Work", shareWith({ [viewer]: READ }));
      await warm(viewer);

      const scans = await quietly(viewer, async () => {
        await createFolder(owner, "Brand new");
        await createFolder(viewer, "Mine");
        expect(await mountsOf(viewer)).toEqual([folderMount(owner, "Work")]);
        expect(await sharedWith(viewer)).toEqual([plan]);
      });

      expect(scans).toBe(0);
    });

    it("keeps both caches when a folder is created inside a shared folder", async () => {
      const { owner, viewer } = world();
      const plan = nextUuid();
      writeNote(owner, "Work", "plan", plan);
      await setFolder(owner, "Work", shareWith({ [viewer]: READ }));
      await warm(viewer);

      const scans = await quietly(viewer, async () => {
        await createFolder(owner, "Work/Inner");
        expect(await mountsOf(viewer)).toEqual([folderMount(owner, "Work")]);
        expect(await sharedWith(viewer)).toEqual([plan]);
      });

      expect(scans).toBe(0);
    });

    it("keeps both caches when the owner reorders the folders above a shared one", async () => {
      const { owner, viewer } = world();
      const plan = nextUuid();
      writeNote(owner, "Work", "plan", plan);
      writeNote(owner, "Home", "list", nextUuid());
      await setFolder(owner, "Work", shareWith({ [viewer]: READ }));
      await warm(viewer);

      const scans = await quietly(viewer, async () => {
        await reorder(owner, "", []);
        await writeCatOrder(dirOf(owner), { categories: ["b", "a"] });
        invalidatePath(path.join(dirOf(owner), CATEGORY_INFO_FILE));
        expect(await mountsOf(viewer)).toEqual([folderMount(owner, "Work")]);
        expect(await sharedWith(viewer)).toEqual([plan]);
      });

      expect(scans).toBe(0);
    });

    it("keeps both caches when items are reordered in a shared folder", async () => {
      const { owner, viewer } = world();
      const plan = nextUuid();
      const other = nextUuid();
      writeNote(owner, "Work", "plan", plan);
      writeNote(owner, "Work", "other", other);
      await setFolder(owner, "Work", shareWith({ [viewer]: READ }));
      await warm(viewer);

      const scans = await quietly(viewer, async () => {
        await reorder(owner, "Work", [other, plan]);
        expect(await mountsOf(viewer)).toEqual([folderMount(owner, "Work")]);
        expect(await sharedWith(viewer)).toEqual(sorted(plan, other));
      });

      expect(scans).toBe(0);
    });
  });
});
