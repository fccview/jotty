import { describe, it, expect } from "vitest";
import {
  singleFlight,
  runQueued,
} from "@/app/_server/actions/lib/concurrency";

const defer = () => new Promise((resolve) => setTimeout(resolve, 5));

describe("concurrency guards", () => {
  describe("singleFlight", () => {
    it("should run the task once for concurrent callers on the same key", async () => {
      let runs = 0;

      const task = async () => {
        runs += 1;
        await defer();
        return runs;
      };

      const results = await Promise.all([
        singleFlight("same", task),
        singleFlight("same", task),
        singleFlight("same", task),
      ]);

      expect(runs).toBe(1);
      expect(results).toEqual([1, 1, 1]);
    });

    it("should keep different keys independent", async () => {
      let runs = 0;

      const task = async () => {
        runs += 1;
        await defer();
        return runs;
      };

      await Promise.all([singleFlight("a", task), singleFlight("b", task)]);

      expect(runs).toBe(2);
    });

    it("should run again once the previous flight has settled", async () => {
      let runs = 0;

      const task = async () => {
        runs += 1;
        return runs;
      };

      await singleFlight("later", task);
      await singleFlight("later", task);

      expect(runs).toBe(2);
    });

    it("should reject every joined caller when the task throws", async () => {
      const task = async () => {
        await defer();
        throw new Error("boom");
      };

      const first = singleFlight("angry", task);
      const second = singleFlight("angry", task);

      await expect(first).rejects.toThrow("boom");
      await expect(second).rejects.toThrow("boom");
    });

    it("should recover after a failed flight", async () => {
      let runs = 0;

      await expect(
        singleFlight("recover", async () => {
          runs += 1;
          throw new Error("nope");
        }),
      ).rejects.toThrow("nope");

      await expect(
        singleFlight("recover", async () => {
          runs += 1;
          return "fine";
        }),
      ).resolves.toBe("fine");

      expect(runs).toBe(2);
    });
  });

  describe("runQueued", () => {
    it("should never overlap tasks sharing a key", async () => {
      let active = 0;
      let peak = 0;

      const task = async () => {
        active += 1;
        peak = Math.max(peak, active);
        await defer();
        active -= 1;
      };

      await Promise.all([
        runQueued("lane", task),
        runQueued("lane", task),
        runQueued("lane", task),
      ]);

      expect(peak).toBe(1);
    });

    it("should preserve read-modify-write ordering", async () => {
      const store = { value: 0 };

      const bump = async () => {
        const current = store.value;
        await defer();
        store.value = current + 1;
      };

      await Promise.all([
        runQueued("counter", bump),
        runQueued("counter", bump),
        runQueued("counter", bump),
      ]);

      expect(store.value).toBe(3);
    });

    it("should let a later task run after an earlier one throws", async () => {
      const order: string[] = [];

      const failing = runQueued("mixed", async () => {
        order.push("first");
        throw new Error("boom");
      });

      const following = runQueued("mixed", async () => {
        order.push("second");
        return "done";
      });

      await expect(failing).rejects.toThrow("boom");
      await expect(following).resolves.toBe("done");
      expect(order).toEqual(["first", "second"]);
    });

    it("should run different keys in parallel", async () => {
      let active = 0;
      let peak = 0;

      const task = async () => {
        active += 1;
        peak = Math.max(peak, active);
        await defer();
        active -= 1;
      };

      await Promise.all([runQueued("one", task), runQueued("two", task)]);

      expect(peak).toBe(2);
    });
  });
});
