import { describe, it, expect } from "vitest";
import { summaryMemo } from "@/app/_server/actions/lib/summary-memo";

const FILE = "/data/notes/alice/Work/plan.md";
const stamp = (mtime: number, size: number, ctime: number) => ({
  mtime: new Date(mtime),
  size,
  ctime: new Date(ctime),
});

describe("summaryMemo", () => {
  it("serves a summary while path, mtime, size and ctime all match", () => {
    const memo = summaryMemo<string>();
    memo.remember(FILE, stamp(1000, 42, 1000), "summary");

    expect(memo.recall(FILE, stamp(1000, 42, 1000))).toBe("summary");
  });

  it("misses when a sync tool restores the old mtime but the size changed", () => {
    const memo = summaryMemo<string>();
    memo.remember(FILE, stamp(1000, 42, 1000), "summary");

    expect(memo.recall(FILE, stamp(1000, 57, 1000))).toBeUndefined();
  });

  it("misses when the mtime and size match but the inode changed after a restore", () => {
    const memo = summaryMemo<string>();
    memo.remember(FILE, stamp(1000, 42, 1000), "summary");

    expect(memo.recall(FILE, stamp(1000, 42, 9000))).toBeUndefined();
  });

  it("misses on a coarse mtime that did not move when the content did", () => {
    const memo = summaryMemo<string>();
    memo.remember(FILE, stamp(2000, 10, 2000), "old");

    expect(memo.recall(FILE, stamp(2000, 11, 2000))).toBeUndefined();
    memo.remember(FILE, stamp(2000, 11, 2000), "new");
    expect(memo.recall(FILE, stamp(2000, 11, 2000))).toBe("new");
  });

  it("still works for stats that only carry an mtime", () => {
    const memo = summaryMemo<string>();
    memo.remember(FILE, { mtime: new Date(5) }, "bare");

    expect(memo.recall(FILE, { mtime: new Date(5) })).toBe("bare");
    expect(memo.recall(FILE, { mtime: new Date(6) })).toBeUndefined();
  });

  it("evicts the oldest entry past its limit", () => {
    const memo = summaryMemo<string>(1);
    memo.remember("/a.md", stamp(1, 1, 1), "a");
    memo.remember("/b.md", stamp(1, 1, 1), "b");

    expect(memo.recall("/a.md", stamp(1, 1, 1))).toBeUndefined();
    expect(memo.recall("/b.md", stamp(1, 1, 1))).toBe("b");
  });
});
