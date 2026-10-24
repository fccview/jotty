import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import nodeFs from "fs";
import os from "os";
import path from "path";
import { mockFs, resetAllMocks } from "../setup";

const { touchCached, invalidateCached } = vi.hoisted(() => ({
  touchCached: vi.fn(),
  invalidateCached: vi.fn(),
}));

vi.mock("@/app/_server/actions/lib/metadata-cache", () => ({ touchCached, invalidateCached }));

import { verifyListing } from "@/app/_server/actions/lib/listing-verify";
import { stampKey } from "@/app/_server/actions/lib/summary-memo";

const KEY = "notes:summary:alice";

let dir: string;

const put = (rel: string) => {
  const filePath = path.join(dir, rel);
  nodeFs.mkdirSync(path.dirname(filePath), { recursive: true });
  nodeFs.writeFileSync(filePath, `---\ntitle: ${rel}\n---\n`);
  return filePath;
};

const bookOf = (stamps: Map<string, string>) => ({
  stampOf: (filePath: string) => stamps.get(filePath),
  pathsUnder: () => Array.from(stamps.keys()),
});

const remembered = (...files: string[]) =>
  new Map(files.map((filePath) => [filePath, stampKey(nodeFs.statSync(filePath))]));

describe("verifyListing", () => {
  beforeEach(async () => {
    resetAllMocks();
    touchCached.mockReset();
    invalidateCached.mockReset();
    const real = await vi.importActual<typeof import("fs/promises")>("fs/promises");
    mockFs.readdir.mockImplementation(real.readdir as never);
    mockFs.stat.mockImplementation(real.stat as never);
    dir = nodeFs.realpathSync(nodeFs.mkdtempSync(path.join(os.tmpdir(), "jotty-verify-")));
  });

  afterEach(() => {
    nodeFs.rmSync(dir, { recursive: true, force: true });
  });

  it("leaves a listing alone when every file matches what was read", async () => {
    const stamps = remembered(put("Work/a.md"), put("b.md"));
    await verifyListing(KEY, dir, bookOf(stamps));
    expect(touchCached).not.toHaveBeenCalled();
    expect(invalidateCached).not.toHaveBeenCalled();
  });

  it("marks files edited, added or removed behind the watcher's back", async () => {
    const edited = put("Work/a.md");
    const removed = put("Work/gone.md");
    const stamps = remembered(edited, removed);
    nodeFs.appendFileSync(edited, "a tag added by a sync tool #work\n");
    nodeFs.rmSync(removed);
    const added = put("Home/new.md");

    await verifyListing(KEY, dir, bookOf(stamps));
    expect(touchCached).toHaveBeenCalledTimes(1);
    expect(new Set(touchCached.mock.calls[0][1])).toEqual(new Set([edited, removed, added]));
  });

  it("skips folders the listing never reads", async () => {
    const stamps = remembered(put("Work/a.md"));
    put(".archive/old.md");
    await verifyListing(KEY, dir, bookOf(stamps));
    expect(touchCached).not.toHaveBeenCalled();
  });

  it("drops the listing when the folder can't be read", async () => {
    await verifyListing(KEY, path.join(dir, "missing"), bookOf(new Map()));
    expect(invalidateCached).toHaveBeenCalledWith(KEY);
  });
});
