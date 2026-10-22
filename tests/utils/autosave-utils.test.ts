import { describe, expect, it, vi } from "vitest";
import { createSaveQueue, SaveState } from "@/app/_utils/autosave-utils";

const deferred = () => {
  let resolve: (ok: boolean) => void = () => {};
  const promise = new Promise<boolean>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const setup = () => {
  const calls: { value: string; done: ReturnType<typeof deferred> }[] = [];
  const states: SaveState[] = [];
  const queue = createSaveQueue<string>({
    save: (value) => {
      const done = deferred();
      calls.push({ value, done });
      return done.promise;
    },
    onState: (state) => states.push(state),
  });
  const settle = async (ok = true) => {
    calls[calls.length - 1].done.resolve(ok);
    await Promise.resolve();
    await Promise.resolve();
  };
  return { queue, calls, states, settle };
};

describe("createSaveQueue", () => {
  it("saves immediately without waiting on a timer", () => {
    const { queue, calls, states } = setup();
    queue.push("a");
    expect(calls.map(({ value }) => value)).toEqual(["a"]);
    expect(states).toEqual([SaveState.SAVING]);
  });

  it("keeps one save in flight and coalesces edits to the latest", async () => {
    const { queue, calls, settle } = setup();
    queue.push("a");
    queue.push("ab");
    queue.push("abc");
    expect(calls.map(({ value }) => value)).toEqual(["a"]);
    await settle();
    expect(calls.map(({ value }) => value)).toEqual(["a", "abc"]);
  });

  it("never lets an older value land after a newer one", async () => {
    const order: string[] = [];
    const queue = createSaveQueue<string>({
      save: async (value) => {
        await new Promise((done) => setTimeout(done, value === "old" ? 20 : 0));
        order.push(value);
        return true;
      },
      onState: () => {},
    });
    queue.push("old");
    queue.push("new");
    await queue.flush();
    expect(order).toEqual(["old", "new"]);
  });

  it("flush resolves once everything pushed has been written", async () => {
    const { queue, calls, states, settle } = setup();
    queue.push("a");
    queue.push("ab");
    const flushed = queue.flush();
    await settle();
    await settle();
    await expect(flushed).resolves.toBe(true);
    expect(calls.map(({ value }) => value)).toEqual(["a", "ab"]);
    expect(states[states.length - 1]).toBe(SaveState.SAVED);
  });

  it("keeps a failed value and retries it on the next flush", async () => {
    const { queue, calls, states, settle } = setup();
    queue.push("a");
    await settle(false);
    expect(states[states.length - 1]).toBe(SaveState.FAILED);
    const flushed = queue.flush();
    expect(calls.map(({ value }) => value)).toEqual(["a", "a"]);
    await settle();
    await expect(flushed).resolves.toBe(true);
  });

  it("retries with the newest value when typing continues after a failure", async () => {
    const { queue, calls, settle } = setup();
    queue.push("a");
    await settle(false);
    queue.push("ab");
    expect(calls.map(({ value }) => value)).toEqual(["a", "ab"]);
  });

  it("reports failure from flush when the save keeps failing", async () => {
    const { queue, settle } = setup();
    queue.push("a");
    const flushed = queue.flush();
    await settle(false);
    await expect(flushed).resolves.toBe(false);
  });

  it("treats a thrown save as a failure and logs it", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const queue = createSaveQueue<string>({
      save: async () => {
        throw new Error("disk full");
      },
      onState: () => {},
    });
    queue.push("a");
    await expect(queue.flush()).resolves.toBe(false);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("drops unsaved work on reset", async () => {
    const { queue, calls, settle } = setup();
    queue.push("a");
    queue.push("ab");
    queue.reset();
    await settle();
    expect(calls.map(({ value }) => value)).toEqual(["a"]);
  });
});
