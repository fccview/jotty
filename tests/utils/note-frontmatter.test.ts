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
import { parseNoteContent } from "@/app/_utils/client-parser-utils";

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

  it("keeps unknown keys when a note is read by uuid for editing", () => {
    const parsed = parseNoteContent(IMPORTED_NOTE, "imported");

    expect(parsed.extraMetadata).toEqual({
      aliases: ["second brain", "vault note"],
      cssclasses: ["wide", "dark"],
      publish: true,
      weight: 42,
      frontmatterAuthor: { name: "someone", handle: "@someone" },
    });

    const metadata = metaOf(
      noteToMarkdown({
        id: "imported",
        uuid: "fixed-uuid",
        title: "Edited In Jotty",
        content: parsed.content,
        category: "Uncategorized",
        createdAt: "",
        updatedAt: "",
        extraMetadata: keptMeta(parsed.extraMetadata, undefined),
      }),
    );

    expect(metadata.title).toBe("Edited In Jotty");
    expect(metadata.publish).toBe(true);
    expect(metadata.weight).toBe(42);
    expect(metadata.aliases).toEqual(["second brain", "vault note"]);
  });

  it("falls back to the id for a title without losing stray keys", () => {
    const untitled = ["---", "publish: true", "---", "Body"].join("\n");
    const parsed = parseNoteContent(untitled, "my-note");

    expect(parsed.title).toBe("my note");
    expect(parsed.extraMetadata).toEqual({ publish: true });
  });

  it("prefers incoming stray values over the stored ones", () => {
    expect(
      keptMeta({ publish: false, weight: 1 }, { publish: true }),
    ).toEqual({ publish: true, weight: 1 });
    expect(keptMeta(undefined, undefined)).toBeUndefined();
  });

  describe("sharedWith preservation (issue #601)", () => {
    const SHARED_NOTE = [
      "---",
      "uuid: shared-uuid-1",
      "title: Shared Note",
      "sharedWith:",
      "  - alice",
      "  - bob",
      "tags:",
      "  - work",
      "---",
      "",
      "Body of the shared note.",
    ].join("\n");

    it("parseMarkdownNote surfaces sharedWith on the parsed note", () => {
      const note = parseMarkdownNote(
        SHARED_NOTE,
        "shared-note",
        "Uncategorized",
        "fccview",
      );

      expect(note.sharedWith).toEqual(["alice", "bob"]);
    });

    it("noteToMarkdown writes sharedWith back into the frontmatter", () => {
      const note = parseMarkdownNote(
        SHARED_NOTE,
        "shared-note",
        "Uncategorized",
        "fccview",
      );

      const markdown = noteToMarkdown(note);
      const metadata = metaOf(markdown);

      expect(metadata.sharedWith).toEqual(["alice", "bob"]);
    });

    it("survives a parse, save, reparse round-trip with sharedWith intact", () => {
      const first = parseMarkdownNote(
        SHARED_NOTE,
        "shared-note",
        "Uncategorized",
        "fccview",
      );

      const second = parseMarkdownNote(
        noteToMarkdown(first),
        "shared-note",
        "Uncategorized",
        "fccview",
      );

      expect(second.sharedWith).toEqual(first.sharedWith);
      expect(second.sharedWith).toEqual(["alice", "bob"]);
    });

    it("parseNoteContent (the edit path) surfaces sharedWith", () => {
      const parsed = parseNoteContent(SHARED_NOTE, "shared-note");

      expect(parsed.extraMetadata ?? {}).not.toHaveProperty("sharedWith");
      expect(parsed.sharedWith).toEqual(["alice", "bob"]);
    });

    it("does not drop sharedWith when the note body is edited", () => {
      const parsed = parseNoteContent(SHARED_NOTE, "shared-note");

      const editedNote = {
        id: "shared-note",
        uuid: parsed.uuid || "shared-uuid-1",
        title: "Shared Note",
        content: "Edited body text.",
        category: "Uncategorized",
        createdAt: "",
        updatedAt: "",
        sharedWith: parsed.sharedWith,
        tags: parsed.tags,
        extraMetadata: keptMeta(parsed.extraMetadata, undefined),
      };

      const markdown = noteToMarkdown(editedNote);
      const metadata = metaOf(markdown);

      expect(metadata.sharedWith).toEqual(["alice", "bob"]);
      expect(markdown).toContain("Edited body text.");
    });

    it("supports a single (string) sharedWith value", () => {
      const single = [
        "---",
        "uuid: single-share",
        "title: Single Share",
        "sharedWith: alice",
        "---",
        "",
        "Body.",
      ].join("\n");

      const note = parseMarkdownNote(single, "single", "Uncategorized", "u1");
      expect(note.sharedWith).toBe("alice");

      const metadata = metaOf(noteToMarkdown(note));
      expect(metadata.sharedWith).toBe("alice");
    });

    it("omits sharedWith from frontmatter when it was never set", () => {
      const plain = ["---", "uuid: plain-2", "title: Plain", "---", "Body"].join(
        "\n",
      );

      const note = parseMarkdownNote(plain, "plain", "Uncategorized", "u1");
      expect(note.sharedWith).toBeUndefined();

      const markdown = noteToMarkdown(note);
      const metadata = metaOf(markdown);
      expect(metadata).not.toHaveProperty("sharedWith");
    });
  });
});
