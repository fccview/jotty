import { describe, expect, it } from "vitest";
import { autosaveDelay } from "@/app/_utils/autosave-utils";

describe("autosaveDelay", () => {
  it("waits the full interval for a fresh change", () => {
    expect(autosaveDelay(5000, null, 1000)).toBe(5000);
    expect(autosaveDelay(5000, 1000, 1000)).toBe(5000);
  });

  it("shortens the wait as the max wait approaches", () => {
    expect(autosaveDelay(5000, 0, 12000)).toBe(3000);
  });

  it("saves at once when changes have waited three intervals", () => {
    expect(autosaveDelay(5000, 0, 15000)).toBe(0);
    expect(autosaveDelay(5000, 0, 60000)).toBe(0);
  });
});
