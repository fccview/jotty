import { describe, it, expect } from "vitest";
import { noteStats } from "@/app/_utils/note-stats-utils";

describe("noteStats", () => {
  it("ignores the frontmatter block", () => {
    const stats = noteStats("---\nuuid: stats-note\ntitle: Stats\n---\nthree little words");
    expect(stats.wordCount).toBe(3);
    expect(stats.excerpt).toBe("three little words");
  });

  it("counts text between horizontal rules at the top of the body", () => {
    const stats = noteStats("---\n\nNote: buy milk\n\n---\n\nrest of note");
    expect(stats.wordCount).toBe(6);
    expect(stats.excerpt).toContain("Note: buy milk");
  });
});
