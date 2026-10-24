import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import nodeFs from "fs";
import os from "os";
import path from "path";
import { mockFs, resetAllMocks } from "../setup";
import { patchNoteListing, readNotesRecursively } from "@/app/_server/actions/note/readers";
import { patchListListing, readListsRecursively } from "@/app/_server/actions/checklist/readers";

const A = "aaaaaaaa-1111-4222-8333-944455556666";
const B = "bbbbbbbb-1111-4222-8333-944455556666";
const C = "cccccccc-1111-4222-8333-944455556666";
const D = "dddddddd-1111-4222-8333-944455556666";
const FOLDER = "eeeeeeee-1111-4222-8333-944455556666";
const OPTIONS = { metadataOnly: true };

let dir: string;

const note = (uuid: string, title: string) => `---\nuuid: ${uuid}\ntitle: ${title}\n---\n\nbody`;

const put = (rel: string, content: string) => {
  const filePath = path.join(dir, rel);
  nodeFs.mkdirSync(path.dirname(filePath), { recursive: true });
  nodeFs.writeFileSync(filePath, content);
  return filePath;
};

const useRealFs = async () => {
  const real = await vi.importActual<typeof import("fs/promises")>("fs/promises");
  mockFs.readFile.mockImplementation(real.readFile as never);
  mockFs.writeFile.mockImplementation(real.writeFile as never);
  mockFs.stat.mockImplementation(real.stat as never);
  mockFs.readdir.mockImplementation(real.readdir as never);
  mockFs.access.mockImplementation(real.access as never);
  mockFs.mkdir.mockImplementation(real.mkdir as never);
  mockFs.open.mockImplementation(real.open as never);
};

describe("patchNoteListing", () => {
  beforeEach(async () => {
    resetAllMocks();
    await useRealFs();
    dir = nodeFs.mkdtempSync(path.join(os.tmpdir(), "jotty-note-patch-"));
  });

  afterEach(() => {
    nodeFs.rmSync(dir, { recursive: true, force: true });
  });

  it("swaps in the edited note and leaves the rest of the listing alone", async () => {
    const aPath = put("Work/a.md", note(A, "Alpha"));
    put("Work/b.md", note(B, "Beta"));
    const listing = await readNotesRecursively(dir, "alice", OPTIONS);

    nodeFs.writeFileSync(aPath, note(A, "Alpha renamed"));
    const patched = await patchNoteListing(dir, "alice", OPTIONS)([aPath], listing);

    expect(patched?.map((entry) => entry.title)).toEqual(["Alpha renamed", "Beta"]);
    expect(patched?.[1]).toBe(listing[1]);
  });

  it("slots a new note in where a full read would put it", async () => {
    put("Work/a.md", note(A, "Alpha"));
    put("Work/c.md", note(C, "Gamma"));
    put("Work/Deep/d.md", note(D, "Delta"));
    const listing = await readNotesRecursively(dir, "alice", OPTIONS);
    const fresh = put("Work/b.md", note(B, "Beta"));

    const patched = await patchNoteListing(dir, "alice", OPTIONS)([fresh], listing);
    expect(patched).toEqual(await readNotesRecursively(dir, "alice", OPTIONS));
  });

  it("respects the folder's saved order when slotting a note in", async () => {
    put("Work/a.md", note(A, "Alpha"));
    put("Work/c.md", note(C, "Gamma"));
    put("Work/.category-info.json", JSON.stringify({ uuid: FOLDER, order: { items: [C, B] } }));
    const listing = await readNotesRecursively(dir, "alice", OPTIONS);
    const fresh = put("Work/b.md", note(B, "Beta"));

    const patched = await patchNoteListing(dir, "alice", OPTIONS)([fresh], listing);
    expect(patched?.map((entry) => entry.uuid)).toEqual([C, B, A]);
    expect(patched).toEqual(await readNotesRecursively(dir, "alice", OPTIONS));
  });

  it("drops a deleted note", async () => {
    const aPath = put("Work/a.md", note(A, "Alpha"));
    put("Work/b.md", note(B, "Beta"));
    const listing = await readNotesRecursively(dir, "alice", OPTIONS);
    nodeFs.rmSync(aPath);

    const patched = await patchNoteListing(dir, "alice", OPTIONS)([aPath], listing);
    expect(patched).toEqual(await readNotesRecursively(dir, "alice", OPTIONS));
  });

  it("gives up on a note in a folder the listing has no notes for", async () => {
    put("Work/a.md", note(A, "Alpha"));
    const listing = await readNotesRecursively(dir, "alice", OPTIONS);
    const fresh = put("Elsewhere/b.md", note(B, "Beta"));

    expect(await patchNoteListing(dir, "alice", OPTIONS)([fresh], listing)).toBeNull();
  });

  it("gives up when the note's uuid changed under it", async () => {
    const aPath = put("Work/a.md", note(A, "Alpha"));
    const listing = await readNotesRecursively(dir, "alice", OPTIONS);
    nodeFs.writeFileSync(aPath, note(B, "Alpha"));

    expect(await patchNoteListing(dir, "alice", OPTIONS)([aPath], listing)).toBeNull();
  });

  it("ignores changes inside folders the listing skips", async () => {
    put("Work/a.md", note(A, "Alpha"));
    const listing = await readNotesRecursively(dir, "alice", OPTIONS);
    const archived = put(".archive/old.md", note(B, "Old"));

    expect(await patchNoteListing(dir, "alice", OPTIONS)([archived], listing)).toEqual(listing);
  });
});

describe("patchListListing", () => {
  beforeEach(async () => {
    resetAllMocks();
    await useRealFs();
    dir = nodeFs.mkdtempSync(path.join(os.tmpdir(), "jotty-list-patch-"));
  });

  afterEach(() => {
    nodeFs.rmSync(dir, { recursive: true, force: true });
  });

  const list = (uuid: string, title: string) => `---\nuuid: ${uuid}\ntitle: ${title}\n---\n\n- [ ] milk\n`;

  it("swaps in the ticked list without reading the others", async () => {
    const aPath = put("Home/a.md", list(A, "Groceries"));
    put("Home/b.md", list(B, "Chores"));
    const listing = await readListsRecursively(dir, "alice", OPTIONS);

    nodeFs.writeFileSync(aPath, list(A, "Groceries for Sunday"));
    const patched = await patchListListing(dir, "alice", OPTIONS)([aPath], listing);

    expect(patched?.map((entry) => entry.title)).toEqual(["Groceries for Sunday", "Chores"]);
  });

  it("slots a new list in where a full read would put it", async () => {
    put("Home/a.md", list(A, "Groceries"));
    put("Home/c.md", list(C, "Errands"));
    const listing = await readListsRecursively(dir, "alice", OPTIONS);
    const fresh = put("Home/b.md", list(B, "Chores"));

    const patched = await patchListListing(dir, "alice", OPTIONS)([fresh], listing);
    expect(patched).toEqual(await readListsRecursively(dir, "alice", OPTIONS));
  });
});
