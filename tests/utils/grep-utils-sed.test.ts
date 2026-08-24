import { describe, it, expect, afterAll } from "vitest";
import os from "os";
import path from "path";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import {
  grepExtractFrontmatter,
  grepExtractExcerpt,
} from "@/app/_utils/grep-utils";

/**
 * @todo fccview is telling you to review this AI generated code
 * and make sure it's up to standards, reusable, modular and consistent with
 * the rest of the codebase.
 */

/**
 * These tests run the REAL shell commands (sed) from grep-utils against real
 * files on disk. They are deliberately NOT mocked, because the whole point is
 * to guard against sed dialect incompatibilities between GNU sed (Linux) and
 * BSD sed (macOS). The previous implementation used GNU-only `{...q}` / `{...d}`
 * block syntax that BSD sed rejects, which silently made grepExtractFrontmatter
 * return null on macOS and broke note sharing (the share was written to disk but
 * never read back, so the recipient never saw it and the permission panel never
 * appeared).
 */
const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "jotty-grep-sed-"));

const notePath = (name: string): string => path.join(tmpRoot, name);

afterAll(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe("grepExtractFrontmatter - sed portability", () => {
  it("reads back sharedWith written into a note's frontmatter (the sharing bug scenario)", async () => {
    // This is exactly what shareItem writes via updateYamlMetadata + serverWriteFile.
    const file = notePath("shared.md");
    writeFileSync(
      file,
      [
        "---",
        "uuid: 0798d08a-5750-4035-aa73-4d45e008f3bb",
        "title: dsadsasad",
        "sharedWith: admin1:r",
        "---",
        "dsadddsadsadsa",
        "",
      ].join("\n"),
    );

    const metadata = await grepExtractFrontmatter(file);

    // resolveAccess relies on this to find the explicit share. If it returns
    // null, the share is invisible (the bug).
    expect(metadata).not.toBeNull();
    expect(metadata?.uuid).toBe("0798d08a-5750-4035-aa73-4d45e008f3bb");
    expect(metadata?.title).toBe("dsadsasad");
    expect(metadata?.sharedWith).toBe("admin1:r");
  });

  it("returns null for a file with no frontmatter", async () => {
    const file = notePath("no-fm.md");
    writeFileSync(file, "Just a body, no frontmatter at all.\n");

    const metadata = await grepExtractFrontmatter(file);

    expect(metadata).toBeNull();
  });

  it("returns null for frontmatter with only the delimiters (no keys)", async () => {
    const file = notePath("empty-fm.md");
    writeFileSync(file, ["---", "---", "body text", ""].join("\n"));

    // An empty YAML block parses to undefined, so the function treats it as
    // "no metadata" - same as having no frontmatter at all.
    const metadata = await grepExtractFrontmatter(file);

    expect(metadata).toBeNull();
  });

  it("parses multi-line / nested frontmatter values", async () => {
    const file = notePath("nested.md");
    writeFileSync(
      file,
      [
        "---",
        "uuid: nested-1",
        "tags:",
        "  - work",
        "  - personal",
        "sharedWith: bob:w, carol:d",
        "---",
        "body",
        "",
      ].join("\n"),
    );

    const metadata = await grepExtractFrontmatter(file);

    expect(metadata?.uuid).toBe("nested-1");
    expect(metadata?.tags).toEqual(["work", "personal"]);
    expect(metadata?.sharedWith).toBe("bob:w, carol:d");
  });

  it("does not leak body content into the parsed metadata", async () => {
    const file = notePath("body-leak.md");
    writeFileSync(
      file,
      [
        "---",
        "title: Real Title",
        "---",
        "uuid: should-not-be-parsed",
        "sharedWith: should-not-be-parsed",
        "",
      ].join("\n"),
    );

    const metadata = await grepExtractFrontmatter(file);

    expect(metadata).toEqual({ title: "Real Title" });
    expect(metadata?.uuid).toBeUndefined();
    expect(metadata?.sharedWith).toBeUndefined();
  });
});

describe("grepExtractExcerpt - sed portability", () => {
  it("strips the frontmatter and returns only the body excerpt", async () => {
    const file = notePath("excerpt.md");
    writeFileSync(
      file,
      [
        "---",
        "uuid: excerpt-1",
        "title: Excerpted",
        "sharedWith: admin1:r",
        "---",
        "This is the body that should survive as the excerpt.",
        "",
      ].join("\n"),
    );

    const excerpt = await grepExtractExcerpt(file, 200);

    // BSD sed previously choked on the `{...d}` block and returned nothing,
    // so every note preview was blank on macOS.
    expect(excerpt).toContain("This is the body that should survive");
    expect(excerpt).not.toContain("sharedWith");
    expect(excerpt).not.toContain("excerpt-1");
  });

  it("returns the whole body when there is no frontmatter", async () => {
    const file = notePath("excerpt-no-fm.md");
    writeFileSync(file, "No frontmatter here, just text.\n");

    const excerpt = await grepExtractExcerpt(file, 200);

    expect(excerpt).toContain("No frontmatter here, just text.");
  });
});