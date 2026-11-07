import { describe, it, expect, vi, afterAll, beforeAll } from "vitest";
import path from "path";
import { mkdirSync, rmSync, statSync, writeFileSync } from "fs";

const { home, root } = vi.hoisted(() => {
  const os = process.getBuiltinModule("os");
  const fs = process.getBuiltinModule("fs");
  const nodePath = process.getBuiltinModule("path");
  const previous = process.cwd();

  process.chdir(fs.mkdtempSync(nodePath.join(os.tmpdir(), "jotty-admin-library-")));

  return { home: previous, root: process.cwd() };
});

vi.unmock("fs/promises");
vi.unmock("@/app/_utils/checklist-utils");

const { access } = vi.hoisted(() => ({ access: { admin: true } }));

vi.mock("@/app/_server/actions/users", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/_server/actions/users")>()),
  isAdmin: async () => access.admin,
  canAccessAllContent: async () => access.admin,
}));

import { adminCounts, adminLibrary } from "@/app/_server/actions/admin/library";
import { getAllNotes } from "@/app/_server/actions/note/queries";
import { getAllLists } from "@/app/_server/actions/checklist/queries";
import { invalidatePath } from "@/app/_server/actions/lib/metadata-cache";
import { DATA_DIR } from "@/app/_consts/files";
import { Modes } from "@/app/_types/enums";
import type { AdminRow, Checklist, Note } from "@/app/_types";

const BODY = "a private paragraph nobody should ship to the browser";
const USERS = ["alice", "bob", "carol"];

const itemPath = (mode: Modes, owner: string, category: string, name: string) =>
  path.join(root, DATA_DIR, mode, owner, category, `${name}.md`);

const put = (filePath: string, content: string) => {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
  invalidatePath(filePath);
};

const note = (owner: string, category: string, name: string, uuid: string, body: string, extra = "") =>
  put(itemPath(Modes.NOTES, owner, category, name), `---\nuuid: ${uuid}\ntitle: ${name}\n${extra}---\n\n${body}\n`);

const list = (owner: string, category: string, name: string, uuid: string, lines: string[]) =>
  put(
    itemPath(Modes.CHECKLISTS, owner, category, name),
    `---\nuuid: ${uuid}\ntitle: ${name}\n---\n\n${lines.join("\n")}\n`,
  );

const rowOf = (item: Note | Checklist, size: number): AdminRow => ({
  uuid: item.uuid || "",
  id: item.id,
  title: item.title,
  owner: item.owner || "",
  category: item.category || "",
  isShared: Boolean(item.isShared),
  size,
});

const fileSizeOf = (doc: Note) =>
  statSync(itemPath(Modes.NOTES, doc.owner || "", doc.category || "", doc.id)).size;

const byUuid = (rows: AdminRow[]) => [...rows].sort((a, b) => a.uuid.localeCompare(b.uuid));

const fromFullReads = async () => ({
  notes: byUuid(((await getAllNotes()).data || []).map((doc) => rowOf(doc, fileSizeOf(doc)))),
  checklists: byUuid(((await getAllLists()).data || []).map((item) => rowOf(item, item.items.length))),
});

const seed = () => {
  mkdirSync(path.join(root, DATA_DIR, "users"), { recursive: true });
  writeFileSync(
    path.join(root, DATA_DIR, "users", "users.json"),
    JSON.stringify(USERS.map((username) => ({ username }))),
  );

  note("alice", "Work", "plan", "a0000000-0000-4000-8000-000000000001", `${BODY} ${"word ".repeat(400)}`);
  note("alice", "Work/Deep", "deeper", "a0000000-0000-4000-8000-000000000002", "short");
  note("alice", "", "loose", "a0000000-0000-4000-8000-000000000003", "émoji ✨ body");
  note(
    "alice",
    "Vault",
    "sealed",
    "a0000000-0000-4000-8000-000000000004",
    "-----BEGIN PGP MESSAGE-----\nabc\n-----END PGP MESSAGE-----",
    "encrypted: true\n",
  );
  note("alice", ".archive", "old", "a0000000-0000-4000-8000-000000000005", "archived away");
  note("bob", "Home", "groceries", "b0000000-0000-4000-8000-000000000001", BODY, "sharedWith: alice:r\n");

  list("bob", "Home", "weekly", "b1000000-0000-4000-8000-000000000001", [
    "- [ ] milk",
    "  - [ ] oat",
    "- [x] eggs",
    "- [ ] bread",
  ]);
  list("alice", "Errands", "todo", "a1000000-0000-4000-8000-000000000001", ["- [ ] one"]);
};

beforeAll(seed);

afterAll(() => {
  process.chdir(home);
  rmSync(root, { recursive: true, force: true });
});

describe("admin library", () => {
  it("lists the same rows the full reads did, without any note body", async () => {
    const expected = await fromFullReads();
    const library = await adminLibrary(USERS);

    expect(byUuid(library.notes)).toEqual(expected.notes);
    expect(byUuid(library.checklists)).toEqual(expected.checklists);
    expect(expected.notes).toHaveLength(5);
    expect(expected.checklists).toHaveLength(2);
    expect(JSON.stringify(library)).not.toContain(BODY);
    expect(JSON.stringify(library)).not.toContain("PGP");
  });

  it("counts every user's items the way the full reads did", async () => {
    const counts = await adminCounts(USERS);
    const notes = (await getAllNotes()).data || [];
    const lists = (await getAllLists()).data || [];
    const owned = (items: { owner?: string }[], owner: string) =>
      items.filter((item) => item.owner === owner).length;

    expect(counts).toEqual({
      alice: { notes: owned(notes, "alice"), checklists: owned(lists, "alice") },
      bob: { notes: owned(notes, "bob"), checklists: owned(lists, "bob") },
      carol: { notes: 0, checklists: 0 },
    });
  });

  it("hands nothing to someone who is not an admin", async () => {
    access.admin = false;
    try {
      expect(await adminLibrary(USERS)).toEqual({ notes: [], checklists: [] });
      expect(await adminCounts(USERS)).toEqual({});
    } finally {
      access.admin = true;
    }
  });

  it("does not count a folder named like a note", async () => {
    mkdirSync(path.join(root, DATA_DIR, Modes.NOTES, "bob", "ideas.md"), { recursive: true });
    const notes = ((await getAllNotes()).data || []).filter((doc) => doc.owner === "bob");
    expect((await adminCounts(USERS)).bob.notes).toBe(notes.length);
  });

  it("picks up edits on the next load", async () => {
    await adminLibrary(USERS);
    note("alice", "Work/Deep", "deeper", "a0000000-0000-4000-8000-000000000002", "now a little longer");
    list("alice", "Errands", "todo", "a1000000-0000-4000-8000-000000000001", ["- [ ] one", "- [ ] two"]);
    note("carol", "", "first", "c0000000-0000-4000-8000-000000000001", "hello");

    const expected = await fromFullReads();
    const library = await adminLibrary(USERS);

    expect(byUuid(library.notes)).toEqual(expected.notes);
    expect(byUuid(library.checklists)).toEqual(expected.checklists);
    expect((await adminCounts(USERS)).carol).toEqual({ notes: 1, checklists: 0 });
  });
});
