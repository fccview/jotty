import { describe, it, expect } from "vitest";
import {
  parseMarkdownNote,
  noteToMarkdown,
} from "@/app/_server/actions/note/parsers";
import {
  extractYamlMetadata,
  strayMeta,
  keptMeta,
} from "@/app/_utils/yaml-metadata-utils";

const IMPORTED_NOTE = [
  "---",
  "title: Imported From Obsidian",
  "aliases:",
  "  - second brain",
  "  - vault note",
  "cssclasses: [wide, dark]",
  "publish: true",
  "weight: 42",
  "frontmatterAuthor:",
  "  name: someone",
  "  handle: '@someone'",
  "tags:",
  "  - work",
  "---",
  "",
  "Body text stays put.",
].join("\n");

const metaOf = (markdown: string): Record<string, unknown> =>
  extractYamlMetadata(markdown).metadata as Record<string, unknown>;

describe("note frontmatter preservation", () => {
  it("keeps unknown keys on the parsed note", () => {
    const note = parseMarkdownNote(
      IMPORTED_NOTE,
      "imported",
      "Uncategorized",
      "fccview",
    );

    expect(note.extraMetadata).toEqual({
      aliases: ["second brain", "vault note"],
      cssclasses: ["wide", "dark"],
      publish: true,
      weight: 42,
      frontmatterAuthor: { name: "someone", handle: "@someone" },
    });
    expect(note.title).toBe("Imported From Obsidian");
    expect(note.tags).toEqual(["work"]);
    expect(note.content).toBe("Body text stays put.");
  });

  it("writes unknown keys back out on save", () => {
    const note = parseMarkdownNote(
      IMPORTED_NOTE,
      "imported",
      "Uncategorized",
      "fccview",
    );

    const markdown = noteToMarkdown(note);
    const metadata = metaOf(markdown);

    expect(metadata.aliases).toEqual(["second brain", "vault note"]);
    expect(metadata.cssclasses).toEqual(["wide", "dark"]);
    expect(metadata.publish).toBe(true);
    expect(metadata.weight).toBe(42);
    expect(metadata.frontmatterAuthor).toEqual({
      name: "someone",
      handle: "@someone",
    });
    expect(markdown).toContain("Body text stays put.");
  });

  it("survives a parse, save, reparse round-trip", () => {
    const first = parseMarkdownNote(
      IMPORTED_NOTE,
      "imported",
      "Uncategorized",
      "fccview",
    );
    const second = parseMarkdownNote(
      noteToMarkdown(first),
      "imported",
      "Uncategorized",
      "fccview",
    );

    expect(second.extraMetadata).toEqual(first.extraMetadata);
    expect(second.uuid).toBe(first.uuid);
  });

  it("lets Jotty owned fields win over the stale file values", () => {
    const note = parseMarkdownNote(
      IMPORTED_NOTE,
      "imported",
      "Uncategorized",
      "fccview",
    );

    const markdown = noteToMarkdown({
      ...note,
      title: "Renamed By Jotty",
      tags: ["renamed"],
      uuid: "fixed-uuid",
    });
    const metadata = metaOf(markdown);

    expect(metadata.title).toBe("Renamed By Jotty");
    expect(metadata.tags).toEqual(["renamed"]);
    expect(metadata.uuid).toBe("fixed-uuid");
    expect(metadata.aliases).toEqual(["second brain", "vault note"]);
  });

  it("adds a missing uuid without dropping foreign metadata", () => {
    const withoutUuid = parseMarkdownNote(
      IMPORTED_NOTE,
      "imported",
      "Uncategorized",
      "fccview",
    );

    expect(withoutUuid.uuid).toBeTruthy();

    const metadata = metaOf(noteToMarkdown(withoutUuid));

    expect(metadata.uuid).toBe(withoutUuid.uuid);
    expect(metadata.publish).toBe(true);
  });

  it("returns nothing when the frontmatter is all Jotty owned", () => {
    const plain = ["---", "uuid: plain-1", "title: Plain", "---", "Body"].join(
      "\n",
    );

    expect(strayMeta(metaOf(plain))).toBeUndefined();
    expect(noteToMarkdown(
      parseMarkdownNote(plain, "plain", "Uncategorized", "fccview"),
    )).not.toContain("aliases");
  });

  it("prefers incoming stray values over the stored ones", () => {
    expect(
      keptMeta({ publish: false, weight: 1 }, { publish: true }),
    ).toEqual({ publish: true, weight: 1 });
    expect(keptMeta(undefined, undefined)).toBeUndefined();
  });
});
