import { describe, it, expect, vi, beforeEach, afterAll, afterEach } from "vitest";
import path from "path";
import os from "os";
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "fs";

vi.unmock("fs/promises");

import fs from "fs/promises";
import { listingStats } from "@/app/_server/actions/lib/listing-stats";
import { ARCHIVED_DIR_NAME, TEMPLATES_DIR_NAME } from "@/app/_consts/files";

const root = mkdtempSync(path.join(os.tmpdir(), "jotty-listing-stats-"));

const write = (relative: string, body = "hello") => {
  const filePath = path.join(root, relative);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, body);
  return filePath;
};

const sameAsStat = (filePath: string, entry?: { birthtime: Date; mtime: Date; size?: number; ctime?: Date }) => {
  const real = statSync(filePath);
  expect(entry?.birthtime.getTime()).toBe(real.birthtime.getTime());
  expect(entry?.mtime.getTime()).toBe(real.mtime.getTime());
  expect(entry?.ctime?.getTime()).toBe(real.ctime.getTime());
  expect(entry?.size).toBe(real.size);
};

beforeEach(() => {
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("listingStats", () => {
  it("returns exactly what fs.stat returns for every note under the folder", async () => {
    const top = write("top.md");
    const nested = write("Work/Deep/nested.md", "a longer body");
    write("Work/readme.txt");

    const stats = await listingStats(root);

    expect(Array.from(stats.keys()).sort()).toEqual([top, nested].sort());
    sameAsStat(top, stats.get(top));
    sameAsStat(nested, stats.get(nested));
  });

  it("keeps file names with spaces and pipes", async () => {
    const spaced = write("with space.md");
    const piped = write("odd|name.md");

    const stats = await listingStats(root);

    expect(stats.has(spaced)).toBe(true);
    expect(stats.has(piped)).toBe(true);
  });

  it("skips templates and the archive unless the archive is asked for", async () => {
    const kept = write("kept.md");
    const archived = write(`${ARCHIVED_DIR_NAME}/old.md`);
    write(`${TEMPLATES_DIR_NAME}/meeting.md`);

    expect(Array.from((await listingStats(root)).keys())).toEqual([kept]);
    expect(Array.from((await listingStats(root, true)).keys()).sort()).toEqual(
      [archived, kept].sort(),
    );
  });

  it("drops only the note that vanished between listing and stat", async () => {
    const stays = write("stays.md");
    const goes = write("goes.md");
    const realStat = fs.stat;
    vi.spyOn(fs, "stat").mockImplementation(async (target, ...rest) => {
      if (target === goes) throw Object.assign(new Error("gone"), { code: "ENOENT" });
      return realStat(target, ...rest);
    });

    const stats = await listingStats(root);

    expect(Array.from(stats.keys())).toEqual([stays]);
  });

  it("returns nothing for a folder that doesn't exist", async () => {
    expect((await listingStats(path.join(root, "missing"))).size).toBe(0);
  });
});
