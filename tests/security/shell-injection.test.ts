import { describe, it, expect, afterAll, beforeEach } from "vitest";
import os from "os";
import path from "path";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import {
  grepExtractExcerpt,
  grepExtractField,
  grepExtractFrontmatter,
  grepFindFileByUuid,
  grepFindFilesByField,
  grepListAllFiles,
} from "@/app/_utils/grep-utils";

const ROOT = mkdtempSync(path.join(os.tmpdir(), "jotty-shell-"));
const PWNED = path.join(ROOT, "pwned");
const PAYLOAD = `$(touch ${PWNED})`;
const TICKS = `\`touch ${PWNED}\``;
const UUID = "0798d08a-5750-4035-aa73-4d45e008f3bb";

const EVIL_DIR = path.join(ROOT, PAYLOAD);
const EVIL_NOTE = path.join(EVIL_DIR, "note.md");

afterAll(() => {
  rmSync(ROOT, { recursive: true, force: true });
});

beforeEach(() => {
  rmSync(PWNED, { force: true });
  mkdirSync(EVIL_DIR, { recursive: true });
  writeFileSync(
    EVIL_NOTE,
    ["---", `uuid: ${UUID}`, "title: Evil", "---", "body", ""].join("\n"),
  );
});

describe("Security: shell injection in grep utils", () => {
  it("does not run command substitution from a looked-up value", async () => {
    await grepFindFileByUuid(ROOT, `x${PAYLOAD}`);
    await grepFindFileByUuid(ROOT, `x${TICKS}`);
    await grepFindFilesByField(ROOT, "uuid", `x${PAYLOAD}`);

    expect(existsSync(PWNED)).toBe(false);
  });

  it("treats a looked-up value as a literal, not a pattern", async () => {
    expect(await grepFindFileByUuid(ROOT, ".*")).toBeNull();
    expect(await grepFindFilesByField(ROOT, "uuid", ".*")).toEqual([]);
  });

  it("does not run command substitution from a category name in a path", async () => {
    await grepExtractFrontmatter(EVIL_NOTE);
    await grepExtractExcerpt(EVIL_NOTE);
    await grepExtractField(EVIL_NOTE, "uuid");
    await grepListAllFiles(EVIL_DIR);

    expect(existsSync(PWNED)).toBe(false);
  });

  it("still reads files that live in an oddly named category", async () => {
    expect((await grepFindFileByUuid(ROOT, UUID))?.filePath).toBe(EVIL_NOTE);
    expect((await grepExtractFrontmatter(EVIL_NOTE))?.title).toBe("Evil");
    expect(await grepExtractField(EVIL_NOTE, "uuid")).toBe(UUID);
    expect(await grepExtractExcerpt(EVIL_NOTE)).toBe("body");
  });
});
