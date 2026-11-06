import { describe, it, expect, vi } from "vitest";
import os from "os";
import path from "path";
import { mkdirSync, mkdtempSync, writeFileSync } from "fs";
import { CATEGORY_INFO_FILE } from "@/app/_consts/sharing";
import {
  getOrCompute,
  invalidateCached,
  invalidatePath,
  dropByPrefix,
  metaCacheKey,
} from "@/app/_server/actions/lib/metadata-cache";
import { Modes } from "@/app/_types/enums";

const defer = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));

const tempDir = (): string =>
  mkdtempSync(path.join(os.tmpdir(), "jotty-meta-cache-"));

const until = async (done: () => boolean, ms = 3000) => {
  const deadline = Date.now() + ms;
  while (!done() && Date.now() < deadline) await defer(25);
};

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

  it("should share one cache across separately bundled copies of the module", async () => {
    const dir = tempDir();
    let runs = 0;

    const compute = async () => {
      runs += 1;
      return [runs];
    };

    const sidebar = await import("@/app/_server/actions/lib/metadata-cache");
    vi.resetModules();
    const api = await import("@/app/_server/actions/lib/metadata-cache");

    expect(api).not.toBe(sidebar);

    await sidebar.getOrCompute("split:one", dir, compute);
    api.invalidatePath(path.join(dir, "gone.md"));

    const after = await sidebar.getOrCompute("split:one", dir, compute);

    expect(after).toEqual([2]);
  });

  describe("patching one changed note", () => {
    interface Row {
      id: string;
      version: number;
    }

    const listing = (version = 1): Row[] => [
      { id: "a", version },
      { id: "b", version },
    ];

    it("re-reads only the changed file and keeps everything else in place", async () => {
      const dir = tempDir();
      const compute = vi.fn(async () => listing());
      const refresh = vi.fn(async (paths: string[], current: Row[]) =>
        current.map((row) => (paths.includes(path.join(dir, `${row.id}.md`)) ? { ...row, version: 2 } : row)),
      );

      await getOrCompute("patch:one", dir, compute, refresh);
      invalidatePath(path.join(dir, "a.md"));
      const patched = await getOrCompute("patch:one", dir, compute, refresh);

      expect(compute).toHaveBeenCalledTimes(1);
      expect(refresh).toHaveBeenCalledWith([path.join(dir, "a.md")], listing());
      expect(patched).toEqual([{ id: "a", version: 2 }, { id: "b", version: 1 }]);
    });

    it("reads everything again when the patch cannot place the change", async () => {
      const dir = tempDir();
      const compute = vi.fn(async () => listing(compute.mock.calls.length));
      const refresh = vi.fn(async () => null);

      await getOrCompute("patch:two", dir, compute, refresh);
      invalidatePath(path.join(dir, "new.md"));
      await getOrCompute("patch:two", dir, compute, refresh);

      expect(refresh).toHaveBeenCalledTimes(1);
      expect(compute).toHaveBeenCalledTimes(2);
    });

    it("reads everything again when a whole folder changes", async () => {
      const dir = tempDir();
      const compute = vi.fn(async () => listing());
      const refresh = vi.fn(async (_paths: string[], current: Row[]) => current);

      await getOrCompute("patch:three", dir, compute, refresh);
      invalidatePath(path.join(dir, "Work"));
      await getOrCompute("patch:three", dir, compute, refresh);

      expect(refresh).not.toHaveBeenCalled();
      expect(compute).toHaveBeenCalledTimes(2);
    });

    it("drops a change that lands while the listing is still being read", async () => {
      const dir = tempDir();
      let runs = 0;
      const compute = async () => {
        runs += 1;
        await defer();
        return listing(runs);
      };
      const refresh = vi.fn(async (_paths: string[], current: Row[]) => current);

      const inflight = getOrCompute("patch:four", dir, compute, refresh);
      invalidatePath(path.join(dir, "a.md"));
      await inflight;
      const after = await getOrCompute("patch:four", dir, compute, refresh);

      expect(refresh).not.toHaveBeenCalled();
      expect(after).toEqual(listing(2));
    });
  });

  describe("folder info changing on disk", () => {
    interface Filed {
      id: string;
      category: string;
    }

    const filed: Filed[] = [
      { id: "a", category: "" },
      { id: "b", category: "Work/Projects" },
    ];

    const writeInfo = (dir: string, folder: string) => {
      mkdirSync(path.join(dir, folder), { recursive: true });
      writeFileSync(path.join(dir, folder, CATEGORY_INFO_FILE), JSON.stringify({ uuid: folder }));
    };

    it("keeps the listing when a folder with nothing listed in it gets its info", async () => {
      const dir = tempDir();
      const compute = vi.fn(async () => filed);
      const refresh = vi.fn(async (_paths: string[], current: Filed[]) => current);
      const read = () => getOrCompute(metaCacheKey(Modes.NOTES, dir), dir, compute, refresh);

      await read();
      writeInfo(dir, "Brand new");
      await defer(200);
      writeFileSync(path.join(dir, "a.md"), "a");
      await until(() => {
        void read();
        return refresh.mock.calls.length + compute.mock.calls.length > 1;
      });

      expect(compute).toHaveBeenCalledTimes(1);
      expect(refresh).toHaveBeenCalled();
    });

    it("reads everything again when a folder holding listed items gets new info", async () => {
      const dir = tempDir();
      const compute = vi.fn(async () => filed);
      const read = () => getOrCompute(metaCacheKey(Modes.CHECKLISTS, dir), dir, compute);

      await read();
      writeInfo(dir, "Work");
      await until(() => {
        void read();
        return compute.mock.calls.length > 1;
      });

      expect(compute).toHaveBeenCalledTimes(2);
    });

    it("hands a folder info change to a cache that can patch itself", async () => {
      const dir = tempDir();
      const infoPath = path.join(dir, "alice", "Brand new", CATEGORY_INFO_FILE);
      const compute = vi.fn(async () => [{ owner: "alice", categoryPath: "Work" }]);
      const refresh = vi.fn(async (_paths: string[], current: unknown[]) => current);
      const read = () => getOrCompute("mounts:notes:carol", dir, compute, refresh, true);

      await read();
      invalidatePath(infoPath);
      await read();

      expect(compute).toHaveBeenCalledTimes(1);
      expect(refresh).toHaveBeenCalledWith([infoPath], [{ owner: "alice", categoryPath: "Work" }]);
    });

    it("drops a cache whose patcher only knows notes when folder info changes", async () => {
      const dir = tempDir();
      const compute = vi.fn(async () => [{ id: "a" }]);
      const refresh = vi.fn(async (_paths: string[], current: unknown[]) => current);
      const read = () => getOrCompute("tags:notes:carol", dir, compute, refresh);

      await read();
      invalidatePath(path.join(dir, "alice", "Work", CATEGORY_INFO_FILE));
      await read();

      expect(refresh).not.toHaveBeenCalled();
      expect(compute).toHaveBeenCalledTimes(2);
    });

    it("keeps an item listing when told about info for a folder it does not hold", async () => {
      const dir = tempDir();
      const compute = vi.fn(async () => filed);
      const read = () => getOrCompute(metaCacheKey(Modes.NOTES, dir), dir, compute);

      await read();
      invalidatePath(path.join(dir, "Brand new", CATEGORY_INFO_FILE));
      await read();
      invalidatePath(path.join(dir, "Work", CATEGORY_INFO_FILE));
      await read();

      expect(compute).toHaveBeenCalledTimes(2);
    });

    it("still drops caches that are not item listings when any folder info changes", async () => {
      const dir = tempDir();
      const compute = vi.fn(async () => [{ owner: "alice", categoryPath: "Work" }]);
      const read = () => getOrCompute("mounts:notes:bob", dir, compute);

      await read();
      writeInfo(dir, "Brand new");
      await until(() => {
        void read();
        return compute.mock.calls.length > 1;
      });

      expect(compute).toHaveBeenCalledTimes(2);
    });
  });
});
