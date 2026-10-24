import { describe, it, expect, vi, afterAll } from "vitest";
import path from "path";
import { mkdirSync, rmSync, writeFileSync } from "fs";

const { home, root } = vi.hoisted(() => {
  const os = process.getBuiltinModule("os");
  const fs = process.getBuiltinModule("fs");
  const nodePath = process.getBuiltinModule("path");
  const previous = process.cwd();

  process.chdir(fs.mkdtempSync(nodePath.join(os.tmpdir(), "jotty-share-patch-")));

  return { home: previous, root: process.cwd() };
});

vi.unmock("fs/promises");

import { allShared } from "@/app/_server/actions/share/queries";
import { mountsFor } from "@/app/_server/actions/share/mounts";
import { invalidatePath } from "@/app/_server/actions/lib/metadata-cache";
import { DATA_DIR } from "@/app/_consts/files";
import { Modes } from "@/app/_types/enums";

const PLAN = "5a5a5a5a-5a5a-4a5a-8a5a-5a5a5a5a5a5a";
const OTHER = "6b6b6b6b-6b6b-4b6b-8b6b-6b6b6b6b6b6b";

const notesDir = path.join(root, DATA_DIR, Modes.NOTES);
const plan = path.join(notesDir, "alice", "Work", "plan.md");
const other = path.join(notesDir, "alice", "Work", "other.md");

const write = (filePath: string, uuid: string, extra = "") => {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `---\nuuid: ${uuid}\ntitle: ${path.basename(filePath)}\n${extra}---\n\nbody`);
  invalidatePath(filePath);
};

const sharedNotes = async () => (await allShared()).notes.map((entry) => entry.uuid);
const bobsLooseItems = async () =>
  (await mountsFor(Modes.NOTES, "bob")).flatMap((mount) => mount.itemUuids || []);

afterAll(() => {
  process.chdir(home);
  rmSync(root, { recursive: true, force: true });
});

describe("share caches after a single note changes", () => {
  it("pick up a share added, ignore an unrelated edit, and drop the share once removed", async () => {
    write(plan, PLAN);
    write(other, OTHER);
    mkdirSync(path.join(notesDir, "bob"), { recursive: true });

    expect(await sharedNotes()).toEqual([]);
    expect(await bobsLooseItems()).toEqual([]);

    write(plan, PLAN, "sharedWith: bob:r\n");
    expect(await sharedNotes()).toEqual([PLAN]);
    expect(await bobsLooseItems()).toEqual([PLAN]);

    write(other, OTHER, "tags:\n  - nothing-to-do-with-sharing\n");
    expect(await sharedNotes()).toEqual([PLAN]);
    expect(await bobsLooseItems()).toEqual([PLAN]);

    write(plan, PLAN);
    expect(await sharedNotes()).toEqual([]);
    expect(await bobsLooseItems()).toEqual([]);
  });
});
