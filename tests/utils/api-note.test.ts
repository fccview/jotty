import { describe, it, expect } from "vitest";
import { noteExcerpt, toApiNote } from "@/app/_utils/api-note";
import { ListView } from "@/app/_schemas/api/common";

const note = (content: string, extra = {}) => ({
  uuid: "uuid-1",
  title: "Garden",
  category: "Home",
  content,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...extra,
});

describe("noteExcerpt", () => {
  it("keeps link and wikilink text and drops markdown syntax", () => {
    expect(noteExcerpt("# Plan\n\nSee [the log](/note/x) and [[Composting|compost]] **now**"))
      .toBe("Plan See the log and compost now");
  });

  it("leaves code blocks out", () => {
    expect(noteExcerpt("Before\n```js\nconst a = 1;\n```\nafter")).toBe("Before after");
  });

  it("cuts long content on a word boundary", () => {
    const excerpt = noteExcerpt("word ".repeat(100));
    expect(excerpt.length).toBeLessThanOrEqual(203);
    expect(excerpt.endsWith("word...")).toBe(true);
  });
});

describe("toApiNote", () => {
  it("returns content in the full view", () => {
    const api = toApiNote(note("hello"));
    expect(api.content).toBe("hello");
    expect(api).not.toHaveProperty("excerpt");
  });

  it("returns an excerpt instead of content in the summary view", () => {
    const api = toApiNote(note("hello there"), ListView.SUMMARY);
    expect(api.excerpt).toBe("hello there");
    expect(api).not.toHaveProperty("content");
  });

  it("never previews an encrypted note", () => {
    const pgp = "-----BEGIN PGP MESSAGE-----\nabc\n-----END PGP MESSAGE-----";
    const api = toApiNote(note(pgp), ListView.SUMMARY);
    expect(api.excerpt).toBeUndefined();
    expect(api.encrypted).toBe(true);
  });

  it("flags encrypted notes in the full view too", () => {
    expect(toApiNote(note("x", { encrypted: true })).encrypted).toBe(true);
  });
});
