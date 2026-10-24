import { describe, it, expect } from "vitest";
import {
  RETRY_BASE_MS,
  RETRY_MAX_MS,
  isCoolingDown,
  nextRetryIn,
  retryDelay,
  retryNow,
  withFailures,
  withoutFailures,
} from "@/app/_utils/browse/body-retry";

describe("note body retry backoff", () => {
  it("doubles the wait per attempt up to a ceiling", () => {
    expect(retryDelay(1)).toBe(RETRY_BASE_MS);
    expect(retryDelay(2)).toBe(RETRY_BASE_MS * 2);
    expect(retryDelay(3)).toBe(RETRY_BASE_MS * 4);
    expect(retryDelay(50)).toBe(RETRY_MAX_MS);
  });

  it("cools a failed key down instead of settling it", () => {
    const failures = withFailures(new Map(), ["a@1"], 1000);

    expect(isCoolingDown(failures, "a@1", 1000)).toBe(true);
    expect(isCoolingDown(failures, "a@1", 1000 + RETRY_BASE_MS)).toBe(false);
    expect(nextRetryIn(failures, 1000)).toBe(RETRY_BASE_MS);
  });

  it("backs off further on repeated failures", () => {
    const once = withFailures(new Map(), ["a@1"], 0);
    const twice = withFailures(once, ["a@1"], 0);

    expect(twice.get("a@1")).toEqual({ attempts: 2, retryAt: RETRY_BASE_MS * 2 });
  });

  it("forgets a key once it loads", () => {
    const failures = withoutFailures(withFailures(new Map(), ["a@1", "b@1"], 0), ["a@1"]);

    expect(failures.has("a@1")).toBe(false);
    expect(failures.has("b@1")).toBe(true);
  });

  it("lets a page or visibility change retry right away without resetting the backoff", () => {
    const failures = retryNow(withFailures(withFailures(new Map(), ["a@1"], 0), ["a@1"], 0));

    expect(isCoolingDown(failures, "a@1", 0)).toBe(false);
    expect(failures.get("a@1")?.attempts).toBe(2);
    expect(nextRetryIn(failures, 0)).toBeNull();
  });

  it("leaves an empty map untouched so it never triggers a render", () => {
    const empty = new Map();

    expect(retryNow(empty)).toBe(empty);
  });
});
