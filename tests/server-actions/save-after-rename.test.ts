import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import path from "path";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";

const { home, root, actor } = vi.hoisted(() => {
  const os = process.getBuiltinModule("os");
  const fs = process.getBuiltinModule("fs");
  const nodePath = process.getBuiltinModule("path");
  const previous = process.cwd();

  process.chdir(fs.mkdtempSync(nodePath.join(os.tmpdir(), "jotty-save-after-rename-")));

  return { home: previous, root: process.cwd(), actor: { username: "alice" } };
});

vi.unmock("fs/promises");
vi.unmock("@/app/_utils/checklist-utils");

vi.mock("@/app/_server/actions/ws/broadcast", () => ({
  broadcast: vi.fn(),
}));

vi.mock("@/app/_server/actions/history/repo", () => ({
  commitNote: vi.fn().mockResolvedValue(undefined),
  commitCategoryRename: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/app/_server/actions/log", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
  logContentEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/app/_server/actions/relations/tracking", () => ({
  trackItemWrite: vi.fn(),
  trackItemDelete: vi.fn(),
  trackTreeDelete: vi.fn(),
  trackMove: vi.fn(),
}));

vi.mock("@/app/_server/actions/relations/tidy", () => ({
  tidyItemLinks: async (content: string) => content,
  refreshWikilinks: (content: string) => content,
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

import { updateNote } from "@/app/_server/actions/note/crud";
import { renameCategory } from "@/app/_server/actions/category/crud";
import { dropMounts } from "@/app/_server/actions/share/mounts";
import { Modes } from "@/app/_types/enums";
import { DATA_DIR, USERS_FILE } from "@/app/_consts/files";
import { appendMove } from "@/app/_utils/category-path-utils";
import { invalidatePath } from "@/app/_server/actions/lib/metadata-cache";

const NOTE = "b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2";

const dirOf = (category: string): string =>
  path.join(root, DATA_DIR, Modes.NOTES, "alice", category);

const fileIn = (category: string): string => path.join(dirOf(category), "sharez-one.md");

const seed = () => {
  mkdirSync(dirOf("ShareZ"), { recursive: true });
  writeFileSync(
    fileIn("ShareZ"),
    ["---", `uuid: ${NOTE}`, "title: ShareZ one", "---", "before", ""].join("\n"),
  );
};

const rename = (oldPath: string, newName: string) => {
  const formData = new FormData();
  formData.append("oldPath", oldPath);
  formData.append("newName", newName);
  formData.append("mode", Modes.NOTES);
  return renameCategory(formData);
};

const formFor = (place: (formData: FormData) => void) => {
  const formData = new FormData();
  formData.append("uuid", NOTE);
  formData.append("title", "ShareZ one");
  formData.append("content", "after");
  place(formData);
  return formData;
};

const save = (picked: string, home: string) =>
  updateNote(formFor((formData) => appendMove(formData, picked, home)));

const autosave = () => updateNote(formFor(() => undefined), true);

afterAll(() => {
  process.chdir(home);
  rmSync(root, { recursive: true, force: true });
});

beforeEach(() => {
  actor.username = "alice";
  rmSync(path.join(root, DATA_DIR), { recursive: true, force: true });
  invalidatePath(path.join(root, DATA_DIR));
  dropMounts(Modes.NOTES);
  mkdirSync(path.dirname(path.join(root, USERS_FILE)), { recursive: true });
  writeFileSync(path.join(root, USERS_FILE), JSON.stringify([{ username: "alice" }]));
  seed();
});

describe("Saving a note whose folder was renamed under the open editor", () => {
  it.each([
    ["a save", () => save("ShareZ", "ShareZ")],
    ["an autosave", autosave],
  ])("keeps %s in the renamed folder instead of recreating the old one", async (_, act) => {
    expect(await rename("ShareZ", "ShareY")).toEqual({ success: true });

    const result = await act();

    expect(result).toMatchObject({ success: true, data: { category: "ShareY" } });
    expect(existsSync(dirOf("ShareZ"))).toBe(false);
    expect(readFileSync(fileIn("ShareY"), "utf-8")).toContain("after");
  });

  it("follows a renamed grandparent too", async () => {
    mkdirSync(dirOf("Top/ShareZ"), { recursive: true });
    rmSync(dirOf("ShareZ"), { recursive: true, force: true });
    writeFileSync(
      fileIn("Top/ShareZ"),
      ["---", `uuid: ${NOTE}`, "title: ShareZ one", "---", "before", ""].join("\n"),
    );
    expect(await rename("Top", "Bottom")).toEqual({ success: true });

    const result = await save("Top/ShareZ", "Top/ShareZ");

    expect(result).toMatchObject({ success: true, data: { category: "Bottom/ShareZ" } });
    expect(existsSync(dirOf("Top"))).toBe(false);
    expect(readFileSync(fileIn("Bottom/ShareZ"), "utf-8")).toContain("after");
  });

  it("still moves the note when somebody picked a different folder", async () => {
    await rename("ShareZ", "ShareY");

    const result = await save("Elsewhere", "ShareZ");

    expect(result).toMatchObject({ success: true, data: { category: "Elsewhere" } });
    expect(existsSync(fileIn("ShareY"))).toBe(false);
    expect(readFileSync(fileIn("Elsewhere"), "utf-8")).toContain("after");
  });

  it("keeps honouring an explicit category from API callers", async () => {
    const result = await updateNote(
      formFor((formData) => formData.append("category", "Elsewhere")),
    );

    expect(result).toMatchObject({ success: true, data: { category: "Elsewhere" } });
    expect(existsSync(fileIn("ShareZ"))).toBe(false);
  });
});
