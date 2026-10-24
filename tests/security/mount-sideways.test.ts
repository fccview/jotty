import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import path from "path";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "fs";

const { home, root } = vi.hoisted(() => {
  const os = process.getBuiltinModule("os");
  const fs = process.getBuiltinModule("fs");
  const nodePath = process.getBuiltinModule("path");
  const previous = process.cwd();

  process.chdir(fs.mkdtempSync(nodePath.join(os.tmpdir(), "jotty-mount-sideways-")));

  return { home: previous, root: process.cwd() };
});

vi.unmock("fs/promises");
vi.unmock("@/app/_utils/checklist-utils");

vi.mock("@/app/_server/actions/ws/broadcast", () => ({ broadcast: vi.fn() }));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

vi.mock("@/app/_server/actions/history/repo", () => ({
  commitNote: vi.fn().mockResolvedValue({ success: true }),
  commitCategoryRename: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/app/_server/actions/users", async (importOriginal) => {
  const bob = {
    username: "bob",
    isAdmin: false,
    fileRenameMode: "minimal",
    preferredDateFormat: "dd/mm/yyyy",
    preferredTimeFormat: "24-hours",
  };
  return {
    ...(await importOriginal<typeof import("@/app/_server/actions/users")>()),
    getCurrentUser: async () => bob,
    getUsername: async () => "bob",
    isAdmin: async () => false,
    canAccessAllContent: async () => false,
  };
});

import { targetDir } from "@/app/_server/actions/share/target";
import { dropMounts, mountsFor } from "@/app/_server/actions/share/mounts";
import { makeNote } from "@/app/_server/actions/note/creator";
import { makeList } from "@/app/_server/actions/checklist/creator";
import { updateNote } from "@/app/_server/actions/note/crud";
import { createCategory } from "@/app/_server/actions/category/crud";
import { moveNode } from "@/app/_server/actions/category/move";
import { Modes } from "@/app/_types/enums";
import { DATA_DIR } from "@/app/_consts/files";
import { CATEGORY_INFO_FILE } from "@/app/_consts/sharing";
import { SanitisedUser } from "@/app/_types";

const FULL = { canRead: true, canEdit: true, canDelete: true, canCreate: true };
const SHARED_NOTE = "66666666-6666-4666-8666-666666666666";
const PRIVATE_NOTE = "77777777-7777-4777-8777-777777777777";

const bob: SanitisedUser = {
  username: "bob",
  isAdmin: false,
  fileRenameMode: "minimal",
  preferredDateFormat: "dd/mm/yyyy",
  preferredTimeFormat: "24-hours",
};

const dirOf = (mode: Modes, owner: string, category = ""): string =>
  path.join(root, DATA_DIR, mode, owner, category);

const writeItem = (mode: Modes, owner: string, category: string, name: string, uuid: string) => {
  const dir = dirOf(mode, owner, category);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, `${name}.md`),
    ["---", `uuid: ${uuid}`, `title: ${name}`, "---", "- [ ] milk", ""].join("\n"),
  );
};

const shareFolder = (mode: Modes, owner: string, category: string) => {
  const dir = dirOf(mode, owner, category);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, CATEGORY_INFO_FILE),
    JSON.stringify({ uuid: `${mode}-recipes`, sharing: { users: { bob: FULL }, inherit: true } }),
  );
};

const privateFiles = (mode: Modes) => readdirSync(dirOf(mode, "alice", "Private")).sort();

let mountName: string;

afterAll(() => {
  process.chdir(home);
  rmSync(root, { recursive: true, force: true });
});

beforeEach(async () => {
  rmSync(path.join(root, DATA_DIR), { recursive: true, force: true });
  dropMounts(Modes.NOTES);
  dropMounts(Modes.CHECKLISTS);

  for (const mode of [Modes.NOTES, Modes.CHECKLISTS]) {
    shareFolder(mode, "alice", "Recipes");
    writeItem(mode, "alice", "Private", "diary", PRIVATE_NOTE);
    mkdirSync(dirOf(mode, "bob"), { recursive: true });
  }
  writeItem(Modes.NOTES, "alice", "Recipes", "pasta", SHARED_NOTE);

  const [mount] = await mountsFor(Modes.NOTES, "bob");
  mountName = mount.displayName;
});

describe("Security: a mount name cannot reach the owner's unshared folders", () => {
  it("still resolves a real path inside the share", async () => {
    const target = await targetDir(Modes.NOTES, "bob", `${mountName}/Sauces`);

    expect(target.isMount).toBe(true);
    expect(target.dir).toBe(dirOf(Modes.NOTES, "alice", "Recipes/Sauces"));
  });

  it.each(["/../Private", "/..", "/./../Private", "//Private", "/Sauces/../../Private", "/x\\..\\..\\Private"])(
    "refuses the mount path %s",
    async (suffix) => {
      const target = await targetDir(Modes.NOTES, "bob", `${mountName}${suffix}`);

      expect(target.isMount).toBe(false);
      expect(target.owner).toBe("bob");
      expect(target.dir.startsWith(dirOf(Modes.NOTES, "alice"))).toBe(false);
    },
  );

  it("does not create a note in the owner's private folder", async () => {
    const form = new FormData();
    form.append("title", "planted");
    form.append("category", `${mountName}/../Private`);
    form.append("rawContent", "hi");

    await makeNote(bob, form);

    expect(privateFiles(Modes.NOTES)).toEqual(["diary.md"]);
  });

  it("does not create a checklist in the owner's private folder", async () => {
    const [listMount] = await mountsFor(Modes.CHECKLISTS, "bob");
    const form = new FormData();
    form.append("title", "planted");
    form.append("category", `${listMount.displayName}/../Private`);

    await makeList(bob, form);

    expect(privateFiles(Modes.CHECKLISTS)).toEqual(["diary.md"]);
  });

  it("does not move a shared note into the owner's private folder on update", async () => {
    const form = new FormData();
    form.append("uuid", SHARED_NOTE);
    form.append("title", "pasta");
    form.append("content", "- [ ] milk");
    form.append("category", `${mountName}/../Private`);

    await updateNote(form);

    expect(privateFiles(Modes.NOTES)).toEqual(["diary.md"]);
    expect(existsSync(path.join(dirOf(Modes.NOTES, "alice", "Recipes"), "pasta.md"))).toBe(true);
  });

  it("does not create a category inside the owner's private folder", async () => {
    const form = new FormData();
    form.append("name", "planted");
    form.append("parent", `${mountName}/../Private`);
    form.append("mode", Modes.NOTES);

    await createCategory(form);

    expect(privateFiles(Modes.NOTES)).toEqual(["diary.md"]);
  });

  it("does not move the owner's private folder into the share", async () => {
    const form = new FormData();
    form.append("mode", Modes.NOTES);
    form.append("activeType", "category");
    form.append("activeCategoryPath", `${mountName}/../Private`);
    form.append("overType", "category");
    form.append("targetCategoryPath", mountName);

    await moveNode(form);

    expect(existsSync(dirOf(Modes.NOTES, "alice", "Private/diary.md"))).toBe(true);
    expect(existsSync(dirOf(Modes.NOTES, "alice", "Recipes/Private"))).toBe(false);
  });
});
