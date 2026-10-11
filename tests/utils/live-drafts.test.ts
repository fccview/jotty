import { describe, it, expect, beforeEach, vi } from "vitest";
import { markSaved, saveDraft, settleDraft } from "@/app/_hooks/useLiveSession";

const NOTE = "7c1e2a52-3c1d-4d7e-9f0a-1b2c3d4e5f60";
const KEY = `jotty-live-draft:${NOTE}`;

const shelf = new Map<string, string>();

beforeEach(() => {
  shelf.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => shelf.get(key) ?? null,
    setItem: (key: string, value: string) => shelf.set(key, value),
    removeItem: (key: string) => shelf.delete(key),
  });
});

const draftFrom = (base: string, markdown: string) => {
  markSaved(NOTE, base);
  saveDraft(NOTE, markdown);
};

describe("live drafts", () => {
  it("restores unsaved changes when the file has not moved on", () => {
    draftFrom("# Shopping\n- milk", "# Shopping\n- milk\n- eggs");

    const settled = settleDraft(NOTE, "# Shopping\n- milk", true);

    expect(settled).toEqual({ markdown: "# Shopping\n- milk\n- eggs", restored: true, dropped: null });
  });

  it("drops a draft built on an older file and hands it back for copying", () => {
    draftFrom("# Shopping\n- milk", "# Shopping\n- milk\n- eggs");

    const settled = settleDraft(NOTE, "# Shopping\n- milk\n- bread", true);

    expect(settled).toEqual({
      markdown: "# Shopping\n- milk\n- bread",
      restored: false,
      dropped: "# Shopping\n- milk\n- eggs",
    });
    expect(shelf.has(KEY)).toBe(false);
  });

  it("never restores into a room somebody else is filling", () => {
    draftFrom("# Shopping\n- milk", "# Shopping\n- milk\n- eggs");

    const settled = settleDraft(NOTE, "# Shopping\n- milk", false);

    expect(settled.restored).toBe(false);
    expect(settled.dropped).toBe("# Shopping\n- milk\n- eggs");
  });

  it("clears a draft that matches the file without a warning", () => {
    draftFrom("# Shopping", "# Shopping\n- milk");

    const settled = settleDraft(NOTE, "# Shopping\n- milk\n", true);

    expect(settled).toEqual({ markdown: "# Shopping\n- milk\n", restored: false, dropped: null });
    expect(shelf.has(KEY)).toBe(false);
  });

  it("forgets the draft once the note is saved", () => {
    draftFrom("# Shopping", "# Shopping\n- milk");

    markSaved(NOTE, "# Shopping\n- milk");

    expect(shelf.has(KEY)).toBe(false);
  });

  it("treats a draft without a base as stale", () => {
    shelf.set(KEY, "# Shopping\n- eggs");

    const settled = settleDraft(NOTE, "# Shopping", true);

    expect(settled.restored).toBe(false);
    expect(settled.dropped).toBe("# Shopping\n- eggs");
  });
});
