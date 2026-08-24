import { describe, it, expect } from "vitest";
import { advanceClickStreak } from "@/app/_hooks/kanban/useMultiClick";

const fresh = () => ({ count: 0, lastAt: 0 });

describe("advanceClickStreak", () => {
  it("signals a trigger once the required count is reached within the window", () => {
    let state = fresh();
    let triggered = false;

    ({ state, triggered } = advanceClickStreak(state, 100, 3, 500));
    expect(triggered).toBe(false);
    expect(state.count).toBe(1);

    ({ state, triggered } = advanceClickStreak(state, 200, 3, 500));
    expect(triggered).toBe(false);
    expect(state.count).toBe(2);

    ({ state, triggered } = advanceClickStreak(state, 300, 3, 500));
    expect(triggered).toBe(true);
    expect(state.count).toBe(0);
  });

  it("does not trigger before the count is reached", () => {
    let state = fresh();
    let triggered = false;

    ({ state, triggered } = advanceClickStreak(state, 100, 3, 500));
    expect(triggered).toBe(false);

    ({ state, triggered } = advanceClickStreak(state, 200, 3, 500));
    expect(triggered).toBe(false);
    expect(state.count).toBe(2);
  });

  it("resets the streak when clicks land outside the window", () => {
    let state = fresh();
    let triggered = false;

    ({ state, triggered } = advanceClickStreak(state, 100, 3, 500));
    ({ state, triggered } = advanceClickStreak(state, 200, 3, 500));
    ({ state, triggered } = advanceClickStreak(state, 900, 3, 500));
    expect(triggered).toBe(false);
    expect(state.count).toBe(1);
  });

  it("keeps the streak alive while clicks stay within the window", () => {
    let state = fresh();
    let triggered = false;

    ({ state, triggered } = advanceClickStreak(state, 0, 3, 500));
    ({ state, triggered } = advanceClickStreak(state, 200, 3, 500));
    ({ state, triggered } = advanceClickStreak(state, 400, 3, 500));
    expect(triggered).toBe(true);
  });

  it("supports a fresh streak after a completed one", () => {
    let state = fresh();
    let triggered = false;

    ({ state, triggered } = advanceClickStreak(state, 0, 3, 500));
    ({ state, triggered } = advanceClickStreak(state, 100, 3, 500));
    ({ state, triggered } = advanceClickStreak(state, 200, 3, 500));
    expect(triggered).toBe(true);

    ({ state, triggered } = advanceClickStreak(state, 300, 3, 500));
    ({ state, triggered } = advanceClickStreak(state, 400, 3, 500));
    ({ state, triggered } = advanceClickStreak(state, 500, 3, 500));
    expect(triggered).toBe(true);
  });

  it("treats the very first click as the start of a new streak (lastAt 0)", () => {
    const { state, triggered } = advanceClickStreak(
      fresh(),
      1000,
      3,
      500,
    );
    expect(triggered).toBe(false);
    expect(state.count).toBe(1);
    expect(state.lastAt).toBe(1000);
  });

  it("triggers on a count of 1 (single-click trigger)", () => {
    const { state, triggered } = advanceClickStreak(fresh(), 100, 1, 500);
    expect(triggered).toBe(true);
    expect(state.count).toBe(0);
  });

  it("uses the exact boundary (window edge is still within the streak)", () => {
    let state = fresh();
    let triggered = false;

    ({ state, triggered } = advanceClickStreak(state, 0, 2, 500));
    ({ state, triggered } = advanceClickStreak(state, 500, 2, 500));
    expect(triggered).toBe(true);
  });

  it("resets when the gap is strictly greater than the window", () => {
    let state = fresh();
    let triggered = false;

    ({ state, triggered } = advanceClickStreak(state, 0, 2, 500));
    ({ state, triggered } = advanceClickStreak(state, 501, 2, 500));
    expect(triggered).toBe(false);
    expect(state.count).toBe(1);
  });
});