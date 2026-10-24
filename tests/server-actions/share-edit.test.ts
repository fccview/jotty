import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import path from "path";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs";

const { home, root, actor } = vi.hoisted(() => {
  const os = process.getBuiltinModule("os");
  const fs = process.getBuiltinModule("fs");
  const nodePath = process.getBuiltinModule("path");
  const previous = process.cwd();

  process.chdir(fs.mkdtempSync(nodePath.join(os.tmpdir(), "jotty-share-edit-")));

  return { home: previous, root: process.cwd(), actor: { username: "alice" } };
});

vi.unmock("fs/promises");
vi.unmock("@/app/_utils/checklist-utils");

vi.mock("@/app/_server/actions/ws/broadcast", () => ({
  broadcast: vi.fn(),
}));

vi.mock("@/app/_server/actions/history/repo", () => ({
  commitNote: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/app/_server/actions/log", () => ({
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

vi.mock("@/app/_server/actions/users", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/_server/actions/users")>()),
  canAccessAllContent: async () => false,
  getUsername: async () => actor.username,
  getCurrentUser: async () => ({ username: actor.username }),
}));

import { updateNote } from "@/app/_server/actions/note/crud";
import { updateList } from "@/app/_server/actions/checklist/crud";
import { extractYamlMetadata } from "@/app/_utils/yaml-metadata-utils";
import { dropMounts } from "@/app/_server/actions/share/mounts";
import { Modes } from "@/app/_types/enums";
import { DATA_DIR, USERS_FILE } from "@/app/_consts/files";
import { UNCATEGORIZED } from "@/app/_consts/notes";

const NOTE = "66666666-6666-4666-8666-666666666666";
const LIST = "88888888-8888-4888-8888-888888888888";
const BORN = "2024-01-02T03:04:05.000Z";
const BOB_OWN = "77777777-7777-4777-8777-777777777777";

const noteDir = (owner: string, category = UNCATEGORIZED): string =>
  path.join(root, DATA_DIR, Modes.NOTES, owner, category);

const listDir = (owner: string): string =>
  path.join(root, DATA_DIR, Modes.CHECKLISTS, owner, UNCATEGORIZED);

const writeFile = (dir: string, name: string, frontmatter: string[], body: string) => {
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, `${name}.md`),
    ["---", ...frontmatter, "---", body, ""].join("\n"),
  );
};

const writeNote = (owner: string, name: string, frontmatter: string[], body: string) =>
  writeFile(noteDir(owner), name, frontmatter, body);

const createdAtIn = (file: string): unknown =>
  extractYamlMetadata(readFileSync(file, "utf-8")).metadata.createdAt;

const saveAs = async (
  username: string,
  content: string,
  category = UNCATEGORIZED,
  title = "Plan",
) => {
  actor.username = username;
  const formData = new FormData();
  formData.append("uuid", NOTE);
  formData.append("title", title);
  formData.append("category", category);
  formData.append("user", "alice");
  formData.append("content", content);
  return updateNote(formData);
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
    JSON.stringify([{ username: "alice" }, { username: "bob" }]),
  );
  writeNote(
    "alice",
    "plan",
    [`createdAt: "${BORN}"`, `uuid: ${NOTE}`, "title: Plan", "sharedWith: bob:rwd"],
    "first",
  );
  writeNote("bob", "mine", [`uuid: ${BOB_OWN}`, "title: Mine"], "bob's own");
});

describe("Editing an uncategorised shared note", () => {
  it("keeps the note in the owner's folder when a recipient saves it", async () => {
    expect(await saveAs("alice", "alice edit")).toMatchObject({ success: true });
    expect(await saveAs("bob", "bob edit")).toMatchObject({ success: true });

    expect(existsSync(path.join(noteDir("alice"), "plan.md"))).toBe(true);
    expect(existsSync(path.join(noteDir("bob"), "plan.md"))).toBe(false);
    expect(readFileSync(path.join(noteDir("alice"), "plan.md"), "utf-8")).toContain("bob edit");
  });

  it("lets the owner keep saving after a recipient edit", async () => {
    await saveAs("alice", "alice edit");
    await saveAs("bob", "bob edit");

    expect(await saveAs("alice", "alice again")).toMatchObject({ success: true });
    expect(readFileSync(path.join(noteDir("alice"), "plan.md"), "utf-8")).toContain("alice again");
  });

  it("still lets a recipient save when the client sends an empty category", async () => {
    expect(await saveAs("bob", "bob edit", "")).toMatchObject({ success: true });
    expect(existsSync(path.join(noteDir("alice"), "plan.md"))).toBe(true);
  });
});

describe("Editing an uncategorised shared checklist", () => {
  it("keeps the list in the owner's folder when a recipient saves it", async () => {
    writeFile(
      listDir("alice"),
      "groceries",
      [`uuid: ${LIST}`, "title: Groceries", "checklistType: simple", "sharedWith: bob:rwd"],
      "- [ ] milk",
    );
    writeFile(listDir("bob"), "mine", ["uuid: 99999999-9999-4999-8999-999999999999", "title: Mine"], "- [ ] tea");

    actor.username = "bob";
    const formData = new FormData();
    formData.append("uuid", LIST);
    formData.append("title", "Groceries");
    formData.append("category", UNCATEGORIZED);

    expect(await updateList(formData)).toMatchObject({ success: true });
    expect(readdirSync(listDir("alice"))).toHaveLength(1);
    expect(readdirSync(listDir("bob"))).toEqual(["mine.md"]);
  });
});

describe("Renaming a note", () => {
  it("keeps its creation date in the renamed file", async () => {
    expect(await saveAs("alice", "renamed", UNCATEGORIZED, "Q3 plan")).toMatchObject({
      success: true,
    });

    const [renamed] = readdirSync(noteDir("alice"));

    expect(renamed).not.toBe("plan.md");
    expect(createdAtIn(path.join(noteDir("alice"), renamed))).toBe(BORN);
  });
});
