import { describe, it, expect } from "vitest";
import { nextItemPerms, storableOnItem } from "@/app/_utils/sharing-utils";

const READ = { canRead: true, canEdit: false, canDelete: false };
const WRITE = { canRead: true, canEdit: true, canDelete: false };
const DELETE = { canRead: true, canEdit: true, canDelete: true };

describe("nextItemPerms", () => {
  it("turns edit on when delete is turned on", () => {
    expect(nextItemPerms(READ, "canDelete", true)).toEqual(DELETE);
  });

  it("turns delete off when edit is turned off", () => {
    expect(nextItemPerms(DELETE, "canEdit", false)).toEqual(READ);
  });

  it("keeps read when every chip is off", () => {
    expect(nextItemPerms(WRITE, "canEdit", false)).toEqual(READ);
    expect(nextItemPerms(READ, "canRead", false)).toEqual(READ);
  });

  it("only produces states an item can store", () => {
    const keys = ["canRead", "canEdit", "canDelete"] as const;
    for (const start of [READ, WRITE, DELETE]) {
      for (const key of keys) {
        for (const value of [true, false]) {
          expect(storableOnItem(nextItemPerms(start, key, value))).toBe(true);
        }
      }
    }
  });
});

describe("storableOnItem", () => {
  it("accepts the three item codes, with or without create", () => {
    expect(storableOnItem(READ)).toBe(true);
    expect(storableOnItem(WRITE)).toBe(true);
    expect(storableOnItem({ ...DELETE, canCreate: true })).toBe(true);
  });

  it("rejects grants an item code would widen", () => {
    expect(storableOnItem({ canRead: true, canEdit: false, canDelete: true })).toBe(false);
    expect(storableOnItem({ canRead: false, canEdit: true, canDelete: false })).toBe(false);
  });
});
