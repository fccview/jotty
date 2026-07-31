import { describe, it, expect } from "vitest";
import os from "os";
import path from "path";
import { mkdtempSync } from "fs";
import {
  getOrCompute,
  invalidateCached,
  dropByPrefix,
} from "@/app/_server/actions/lib/metadata-cache";

const defer = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));

const tempDir = (): string =>
  mkdtempSync(path.join(os.tmpdir(), "jotty-meta-cache-"));

describe("metadata cache", () => {
  it("should serve the computed value from cache on the second call", async () => {
    const dir = tempDir();
    let runs = 0;

    const compute = async () => {
      runs += 1;
      return [runs];
    };

    await getOrCompute("hit:one", dir, compute);
    const second = await getOrCompute("hit:one", dir, compute);

    expect(runs).toBe(1);
    expect(second).toEqual([1]);
  });

  it("should not store a result computed before an invalidation landed", async () => {
    const dir = tempDir();
    let runs = 0;

    const compute = async () => {
      runs += 1;
      await defer();
      return [runs];
    };

    const inflight = getOrCompute("race:one", dir, compute);
    invalidateCached("race:one");

    await inflight;
    const after = await getOrCompute("race:one", dir, compute);

    expect(after).toEqual([2]);
  });

  it("should drop every key sharing a prefix, in flight ones included", async () => {
    const dir = tempDir();
    let runs = 0;

    const compute = async () => {
      runs += 1;
      await defer();
      return [runs];
    };

    const inflight = getOrCompute("mounts:notes:jodi", dir, compute);
    dropByPrefix("mounts:notes:");

    await inflight;
    const after = await getOrCompute("mounts:notes:jodi", dir, compute);

    expect(after).toEqual([2]);
  });

  it("should keep keys outside the dropped prefix", async () => {
    const dir = tempDir();
    let runs = 0;

    const compute = async () => {
      runs += 1;
      return [runs];
    };

    await getOrCompute("mounts:checklists:jodi", dir, compute);
    dropByPrefix("mounts:notes:");

    const after = await getOrCompute("mounts:checklists:jodi", dir, compute);

    expect(after).toEqual([1]);
    expect(runs).toBe(1);
  });
});
