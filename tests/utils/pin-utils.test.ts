import { describe, it, expect } from "vitest";
import { pinsFirst } from "@/app/_utils/pin-utils";

const items = Array.from({ length: 20 }, (_, index) => ({ uuid: `u${index}` }));
const uuids = (list: { uuid?: string }[]) => list.map(({ uuid }) => uuid);

describe("pinsFirst", () => {
  it("puts pins first in pin order", () => {
    expect(uuids(pinsFirst(items, ["u5", "u2"], 3))).toEqual(["u5", "u2", "u0", "u1", "u3"]);
  });

  it("does not let pins eat into the limit", () => {
    const pins = Array.from({ length: 9 }, (_, index) => `u${index}`);
    const result = pinsFirst(items, pins, 12);

    expect(result).toHaveLength(20);
    expect(uuids(result.slice(9))).toEqual(uuids(items.slice(9, 20)));
  });

  it("matches pins stored as category paths", () => {
    expect(uuids(pinsFirst(items, ["Work/Sub/u7"], 1))).toEqual(["u7", "u0"]);
  });

  it("skips pins that no longer exist and dedupes repeated pins", () => {
    expect(uuids(pinsFirst(items, ["gone", "u3", "Cat/u3"], 2))).toEqual(["u3", "u0", "u1"]);
  });
});
